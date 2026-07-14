# OmniMind 文档摄取流水线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PDF、DOC、DOCX、Markdown、TXT 可靠转换为带公网图片 URL 的 Markdown，并异步导入用户私有 RAGFlow dataset。

**Architecture:** MongoDB 保存可租约恢复的状态机；converter 按格式产生统一 `ConvertedDocument`；media processor 使用 Qwen3.5-Flash 摘要图片并上传 MinIO；worker 从最后成功阶段继续。

**Tech Stack:** MinerU Precision Extract API、LibreOffice、python-docx、Pandoc、Qwen3.5-Flash、MinIO SDK、MongoDB、httpx、FastAPI、pytest。

## Global Constraints

- 支持 `.pdf`、`.doc`、`.docx`、`.md`、`.txt`，进入 RAGFlow 前必须是 UTF-8 Markdown。
- PDF 必须经 MinerU；DOC 必须先经 LibreOffice 转 DOCX。
- 图片摘要使用阿里云百炼 `qwen3.5-flash`，50 字以内中文。
- 原件和最终 Markdown 存私有 bucket，图片存公开只读 bucket。
- MinIO 公共 bucket 只允许 `GetObject`，禁止匿名列举和写入。
- 同一用户按 SHA-256 幂等，失败从最后成功阶段重试。
- 不使用 FastAPI `BackgroundTasks` 承载长任务。

---

### Task 1: 摄取任务状态机和原子租约

**Files:**
- Create: `src/omnimind/ingestion/models.py`
- Create: `src/omnimind/ingestion/repository.py`
- Create: `src/omnimind/ingestion/__init__.py`
- Test: `tests/unit/ingestion/test_job_repository.py`

**Interfaces:**
- Produces: `IngestionStage`、`IngestionJob`、`claim_next(worker_id, now, lease_seconds)`、`advance(job_id, from_stage, to_stage)`。

- [ ] **Step 1: 写入阶段与租约测试**

```python
# tests/unit/ingestion/test_job_repository.py
from datetime import UTC, datetime
from unittest.mock import MagicMock
from omnimind.ingestion.models import IngestionStage
from omnimind.ingestion.repository import IngestionJobRepository


def test_stage_order_ends_in_ready() -> None:
    assert list(IngestionStage)[-1] is IngestionStage.READY


def test_claim_uses_atomic_find_one_and_update() -> None:
    database = MagicMock()
    database.ingestion_jobs.find_one_and_update.return_value = {"id": "j1"}
    result = IngestionJobRepository(database).claim_next("worker-1", datetime(2026, 7, 15, tzinfo=UTC), 300)
    assert result["id"] == "j1"
    assert database.ingestion_jobs.find_one_and_update.call_count == 1
```

- [ ] **Step 2: 实现状态枚举与租约**

```python
# src/omnimind/ingestion/models.py
from enum import StrEnum


class IngestionStage(StrEnum):
    RECEIVED = "received"
    VALIDATING = "validating"
    SOURCE_STORED = "source_stored"
    CONVERTING_TO_MARKDOWN = "converting_to_markdown"
    EXTRACTING_IMAGES = "extracting_images"
    SUMMARIZING_IMAGES = "summarizing_images"
    UPLOADING_PUBLIC_ASSETS = "uploading_public_assets"
    REWRITING_MARKDOWN = "rewriting_markdown"
    UPLOADING_TO_RAGFLOW = "uploading_to_ragflow"
    PARSING_IN_RAGFLOW = "parsing_in_ragflow"
    READY = "ready"
```

```python
# src/omnimind/ingestion/repository.py
from datetime import timedelta
from pymongo import ReturnDocument


class IngestionJobRepository:
    def __init__(self, database) -> None:
        self.collection = database.ingestion_jobs

    def claim_next(self, worker_id, now, lease_seconds: int):
        return self.collection.find_one_and_update(
            {"status": {"$in": ["pending", "retry"]}, "$or": [{"lease_until": None}, {"lease_until": {"$lte": now}}]},
            {"$set": {"status": "running", "worker_id": worker_id, "lease_until": now + timedelta(seconds=lease_seconds)}},
            sort=[("created_at", 1)],
            return_document=ReturnDocument.AFTER,
        )

    def advance(self, job_id: str, from_stage: str, to_stage: str) -> bool:
        result = self.collection.update_one({"id": job_id, "stage": from_stage}, {"$set": {"stage": to_stage}})
        return result.modified_count == 1
```

- [ ] **Step 3: 运行测试并提交**

Run: `uv run pytest tests/unit/ingestion/test_job_repository.py -v`
Expected: 2 tests PASS。

```bash
git add src/omnimind/ingestion tests/unit/ingestion/test_job_repository.py
git commit -m "摄取：建立可恢复任务状态机"
```

### Task 2: 五种格式转换器

**Files:**
- Create: `src/omnimind/ingestion/converters/base.py`
- Create: `src/omnimind/ingestion/converters/mineru.py`
- Create: `src/omnimind/ingestion/converters/word.py`
- Create: `src/omnimind/ingestion/converters/markdown.py`
- Create: `src/omnimind/ingestion/converters/text.py`
- Create: `src/omnimind/ingestion/converters/registry.py`
- Test: `tests/unit/ingestion/test_converters.py`
- Test: `tests/contract/test_mineru_client.py`

**Interfaces:**
- Produces: `ConvertedDocument(markdown_path, markdown, media_dir, metadata)`、`ConverterRegistry.for_path(path)`。

- [ ] **Step 1: 写入格式路由测试**

```python
# tests/unit/ingestion/test_converters.py
from pathlib import Path
import pytest
from omnimind.ingestion.converters.registry import ConverterRegistry


@pytest.mark.parametrize(("name", "kind"), [("a.pdf", "pdf"), ("a.doc", "word"), ("a.docx", "word"), ("a.md", "markdown"), ("a.txt", "text")])
def test_registry_routes_supported_extensions(name: str, kind: str) -> None:
    assert ConverterRegistry().kind_for(Path(name)) == kind


def test_registry_rejects_executable() -> None:
    with pytest.raises(ValueError, match="不支持"):
        ConverterRegistry().kind_for(Path("bad.exe"))
```

- [ ] **Step 2: 实现统一结果与 registry**

```python
# src/omnimind/ingestion/converters/base.py
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ConvertedDocument:
    markdown_path: Path
    markdown: str
    media_dir: Path | None
    metadata: dict[str, object]
```

```python
# src/omnimind/ingestion/converters/registry.py
from pathlib import Path


class ConverterRegistry:
    _kinds = {".pdf": "pdf", ".doc": "word", ".docx": "word", ".md": "markdown", ".txt": "text"}

    def kind_for(self, path: Path) -> str:
        try:
            return self._kinds[path.suffix.lower()]
        except KeyError as error:
            raise ValueError(f"不支持的文件格式：{path.suffix}") from error
```

- [ ] **Step 3: 实现 TXT 与 Markdown 规范化**

```python
# src/omnimind/ingestion/converters/text.py
from pathlib import Path
from charset_normalizer import from_bytes
from omnimind.ingestion.converters.base import ConvertedDocument


def convert_text(source: Path, output: Path) -> ConvertedDocument:
    match = from_bytes(source.read_bytes()).best()
    if match is None:
        raise ValueError("无法识别 TXT 编码")
    body = str(match).replace("\r\n", "\n").strip()
    markdown = f"# {source.stem}\n\n{body}\n"
    output.write_text(markdown, encoding="utf-8")
    return ConvertedDocument(output, markdown, None, {"source_type": "txt"})
```

`markdown.py` 暴露 `convert_markdown(source, output) -> ConvertedDocument`：先用 UTF-8 解码，失败时使用 `charset-normalizer`，把 CRLF/CR 统一为 LF，确保文件末尾只有一个换行。逐个解析图片目标；出现 `file://`、盘符/根目录绝对路径或解析后逃逸 `source.parent` 的 `../` 时抛出 `MARKDOWN_UNSAFE_IMAGE_PATH`。测试分别覆盖 UTF-8、GB18030、LF 规范化和三种越界路径。

- [ ] **Step 4: 实现 Word 转换命令边界**

```python
# src/omnimind/ingestion/converters/word.py
from pathlib import Path
import subprocess


def doc_to_docx(source: Path, output_dir: Path) -> Path:
    completed = subprocess.run(["libreoffice", "--headless", "--convert-to", "docx", "--outdir", str(output_dir), str(source)], capture_output=True, text=True, timeout=120, check=False)
    target = output_dir / f"{source.stem}.docx"
    if completed.returncode != 0 or not target.exists():
        raise RuntimeError("WORD_DOC_CONVERSION_FAILED")
    return target


def docx_to_markdown(source: Path, output: Path, media_dir: Path) -> None:
    completed = subprocess.run(["pandoc", str(source), "--from=docx", "--to=gfm", f"--extract-media={media_dir}", "--output", str(output)], capture_output=True, text=True, timeout=120, check=False)
    if completed.returncode != 0:
        raise RuntimeError("WORD_MARKDOWN_CONVERSION_FAILED")
```

- [ ] **Step 5: 实现 MinerU v4 契约测试与安全解压**

MinerU client 固定使用：

```text
POST /api/v4/file-urls/batch
GET  /api/v4/extract-results/batch/{batch_id}
```

`MineruClient.convert_pdf(source, output_dir) -> ConvertedDocument` 依次执行：申请 batch 上传 URL（JSON 含 `model_version: "vlm"` 与原文件名）、PUT PDF、每 2/4/8/16/30 秒轮询 batch，成功后下载 ZIP、`safe_extract`、定位唯一 Markdown 和 images 目录。总等待超过 20 分钟抛出 `MINERU_TIMEOUT`，失败状态抛出 `MINERU_EXTRACT_FAILED` 并附 debug ID。测试验证 Bearer header、请求 JSON、上传 URL PUT、退避序列、失败映射和 ZIP 路径不能逃逸输出目录。`safe_extract` 对每个成员执行 `target.resolve().is_relative_to(output.resolve())`，否则抛出 `MINERU_UNSAFE_ARCHIVE`。

- [ ] **Step 6: 运行测试并提交**

Run: `uv run pytest tests/unit/ingestion/test_converters.py tests/contract/test_mineru_client.py -v`
Expected: PASS，网络由 respx 模拟。

```bash
git add src/omnimind/ingestion/converters tests/unit/ingestion/test_converters.py tests/contract/test_mineru_client.py pyproject.toml uv.lock
git commit -m "摄取：支持五种文档统一转换为 Markdown"
```

### Task 3: Qwen 图片摘要、MinIO 上传与 Markdown 回写

**Files:**
- Create: `src/omnimind/ingestion/media.py`
- Create: `src/omnimind/vision/qwen.py`
- Create: `src/omnimind/storage/minio.py`
- Test: `tests/unit/ingestion/test_media.py`
- Test: `tests/contract/test_qwen_vision.py`

**Interfaces:**
- Produces: `extract_image_refs(markdown, media_dir)`、`summarize_image`、`upload_public_image`、`rewrite_images`。

- [ ] **Step 1: 写入图片回写测试**

```python
# tests/unit/ingestion/test_media.py
from omnimind.ingestion.media import rewrite_images


def test_rewrite_uses_summary_and_public_url() -> None:
    source = "上文\n\n![图1](images/a.png)\n\n下文"
    result = rewrite_images(source, {"images/a.png": ("函数曲线示意图", "https://assets.example/u/k/d/hash.png")})
    assert "![函数曲线示意图](https://assets.example/u/k/d/hash.png)" in result
    assert "images/a.png" not in result
```

- [ ] **Step 2: 实现纯函数回写**

```python
# src/omnimind/ingestion/media.py
import re

IMAGE = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<path>[^)]+)\)")


def rewrite_images(markdown: str, mapping: dict[str, tuple[str, str]]) -> str:
    def replace(match: re.Match[str]) -> str:
        path = match.group("path")
        if path not in mapping:
            return match.group(0)
        summary, url = mapping[path]
        return f"![{summary}]({url})"
    return IMAGE.sub(replace, markdown)
```

- [ ] **Step 3: 实现 Qwen OpenAI 兼容视觉调用**

`QwenVisionClient.summarize(image: bytes, mime_type: str, before: str, after: str) -> str` 使用 OpenAI 兼容接口：`model=qwen3.5-flash`、`enable_thinking=false`、`response_format={"type":"json_object"}`；消息 content 同时包含 base64 `image_url` 和前后各最多 500 字上下文。响应经 Pydantic 校验为 `{"summary": "..."}`，摘要去除换行并截断到 50 个中文字符。HTTP 429/5xx 按 1/2/4 秒最多重试 3 次，401/403 不重试；测试精确断言请求体、重试次数和非法 JSON 错误 `QWEN_INVALID_RESPONSE`。

- [ ] **Step 4: 实现 MinIO 对象键与 bucket 策略**

```python
# src/omnimind/storage/minio.py
from hashlib import sha256


def public_object_key(*, user_id: str, knowledge_base_id: str, document_id: str, content: bytes, suffix: str) -> str:
    user_hash = sha256(user_id.encode()).hexdigest()[:16]
    content_hash = sha256(content).hexdigest()
    return f"{user_hash}/{knowledge_base_id}/{document_id}/{content_hash}{suffix.lower()}"
```

`MinioStorage.upload_public_image(...) -> str` 按 SHA-256 对象键上传并返回 `${MINIO_PUBLIC_BASE_URL}/omnimind-public-assets/{quoted_key}`；同一 key 已存在时不重复上传。启动时校验 bucket policy 只授予匿名 `s3:GetObject` 到 `arn:aws:s3:::omnimind-public-assets/*`，不授予 `s3:ListBucket` 或任何写权限；原件只写 `omnimind-private`。集成测试匿名 GET 图片期望 200，列 bucket、PUT、GET 私有原件均期望 403。

- [ ] **Step 5: 运行测试并提交**

Run: `uv run pytest tests/unit/ingestion/test_media.py tests/contract/test_qwen_vision.py -v`
Expected: PASS。

```bash
git add src/omnimind/ingestion/media.py src/omnimind/vision src/omnimind/storage tests/unit/ingestion/test_media.py tests/contract/test_qwen_vision.py
git commit -m "摄取：增加图片摘要和 MinIO 地址回写"
```

### Task 4: 摄取 worker、上传 API 与 RAGFlow 联调

**Files:**
- Create: `src/omnimind/ingestion/pipeline.py`
- Create: `src/omnimind/ingestion/worker.py`
- Create: `src/omnimind/ingestion/__main__.py`
- Create: `src/omnimind/api/routes/knowledge_bases.py`
- Modify: `src/omnimind/api/app.py`
- Test: `tests/unit/ingestion/test_pipeline.py`
- Test: `tests/e2e/test_ingestion_flow.py`
- Test data: `tests/e2e/fixtures/ingestion/`

**Interfaces:**
- Produces: 创建知识库、上传文件、查询进度、重试和删除 API；可恢复 worker。

- [ ] **Step 1: 写入阶段恢复测试**

```python
# tests/unit/ingestion/test_pipeline.py
import pytest
from omnimind.ingestion.models import IngestionStage
from omnimind.ingestion.pipeline import IngestionPipeline


@pytest.mark.asyncio
async def test_pipeline_resumes_after_source_stored(services, job) -> None:
    job["stage"] = IngestionStage.SOURCE_STORED
    await IngestionPipeline(services).run(job)
    services.store_source.assert_not_called()
    services.convert.assert_awaited_once()
```

- [ ] **Step 2: 实现显式阶段表**

```python
# src/omnimind/ingestion/pipeline.py
from omnimind.ingestion.models import IngestionStage


class IngestionPipeline:
    def __init__(self, services) -> None:
        self.services = services

    async def run(self, job: dict) -> None:
        handlers = {
            IngestionStage.RECEIVED: self.services.validate,
            IngestionStage.VALIDATING: self.services.store_source,
            IngestionStage.SOURCE_STORED: self.services.convert,
            IngestionStage.CONVERTING_TO_MARKDOWN: self.services.extract_images,
            IngestionStage.EXTRACTING_IMAGES: self.services.summarize_images,
            IngestionStage.SUMMARIZING_IMAGES: self.services.upload_assets,
            IngestionStage.UPLOADING_PUBLIC_ASSETS: self.services.rewrite_markdown,
            IngestionStage.REWRITING_MARKDOWN: self.services.upload_ragflow,
            IngestionStage.UPLOADING_TO_RAGFLOW: self.services.start_ragflow_parse,
            IngestionStage.PARSING_IN_RAGFLOW: self.services.wait_ragflow_ready,
        }
        while IngestionStage(job["stage"]) is not IngestionStage.READY:
            await handlers[IngestionStage(job["stage"])](job)
            job = self.services.repository.get(job["id"])
```

- [ ] **Step 3: 实现 API 契约**

```text
POST   /v1/knowledge-bases
GET    /v1/knowledge-bases?user_id={user_id}
PATCH  /v1/knowledge-bases/{id}
DELETE /v1/knowledge-bases/{id}
POST   /v1/knowledge-bases/{id}/documents
GET    /v1/knowledge-bases/{id}/documents
GET    /v1/ingestion-jobs/{job_id}
POST   /v1/ingestion-jobs/{job_id}/retry
```

上传先流式计算 SHA-256 和大小，拒绝超额后再保存。每个 endpoint 先调用 `require_owned_base`；越权统一返回 404。

- [ ] **Step 4: 写端到端 fixture 并运行**

`tests/e2e/fixtures/` 固定提交一页含图片的 PDF、最小 DOCX、带相对 assets 的 Markdown 和 GB18030 TXT。测试为四个文件分别创建 job，外部 MinerU/Qwen/RAGFlow 使用具有固定 JSON 契约的测试 stub，MinIO/Mongo 使用真实测试容器；轮询至 `ready` 后断言 RAGFlow 仅收到 UTF-8 `.md`、Mongo job 阶段完整、图片 URL 可匿名 GET。随后重启 worker 并重放同一 SHA-256，断言不新增 document 或公开对象。

Run: `uv run pytest tests/e2e/test_ingestion_flow.py -v`
Expected: 5 种扩展名最终状态均为 `ready`，最终 Markdown 不含本地图片路径。

- [ ] **Step 5: 提交摄取闭环**

```bash
git add src/omnimind/ingestion src/omnimind/api tests/unit/ingestion tests/e2e/test_ingestion_flow.py
git commit -m "摄取：完成可恢复知识库导入闭环"
```
