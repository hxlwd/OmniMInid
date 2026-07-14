# OmniMind RAGFlow 私有知识库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现按 `user_id` 隔离的知识库所有权、RAGFlow adapter、多知识库装载和供 Agent 使用的检索 MCP。

**Architecture:** MongoDB 是应用所有权真相源，RAGFlow 只保存 dataset/document/index。浏览器和模型永远看不到 RAGFlow 凭据或真实 dataset ID；检索范围由服务端根据 `thread_mounts` 推导。

**Tech Stack:** RAGFlow v0.26.4 HTTP API、httpx、PyMongo、FastMCP、Pydantic、pytest、respx。

## Global Constraints

- 每个知识库属于唯一 `user_id`，首版不共享知识库。
- 用户可创建多个知识库，并在会话中装载一个或多个。
- 所有管理和检索操作必须使用 `user_id` + 业务 ID 校验所有权。
- RAGFlow API 版本差异只存在于 `RagflowClient` adapter。
- 检索失败必须明确返回不可用状态，不允许伪装为成功检索。
- 提交信息使用中文。

---

### Task 1: 知识库模型、repository 与所有权守卫

**Files:**
- Create: `src/omnimind/knowledge/models.py`
- Create: `src/omnimind/knowledge/repository.py`
- Create: `src/omnimind/knowledge/errors.py`
- Create: `src/omnimind/knowledge/__init__.py`
- Test: `tests/unit/knowledge/test_repository.py`

**Interfaces:**
- Produces: `KnowledgeBase`、`KnowledgeDocument`、`KnowledgeRepository.require_owned_base(user_id, knowledge_base_id)`。

- [ ] **Step 1: 写入越权失败测试**

```python
# tests/unit/knowledge/test_repository.py
from unittest.mock import MagicMock
import pytest
from omnimind.knowledge.errors import KnowledgeBaseNotFound
from omnimind.knowledge.repository import KnowledgeRepository


def test_require_owned_base_filters_user_and_id() -> None:
    database = MagicMock()
    database.knowledge_bases.find_one.return_value = None
    repository = KnowledgeRepository(database)
    with pytest.raises(KnowledgeBaseNotFound):
        repository.require_owned_base(user_id="u2", knowledge_base_id="kb1")
    database.knowledge_bases.find_one.assert_called_once_with({"id": "kb1", "user_id": "u2", "status": {"$ne": "deleted"}})
```

- [ ] **Step 2: 实现模型与 repository**

```python
# src/omnimind/knowledge/models.py
from datetime import UTC, datetime
from pydantic import BaseModel, Field


class KnowledgeBase(BaseModel):
    id: str
    user_id: str
    name: str = Field(min_length=1, max_length=120)
    ragflow_dataset_id: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class KnowledgeDocument(BaseModel):
    id: str
    user_id: str
    knowledge_base_id: str
    filename: str
    sha256: str
    ragflow_document_id: str | None = None
    status: str = "received"
```

```python
# src/omnimind/knowledge/errors.py
class KnowledgeBaseNotFound(LookupError):
    pass
```

```python
# src/omnimind/knowledge/repository.py
from omnimind.knowledge.errors import KnowledgeBaseNotFound


class KnowledgeRepository:
    def __init__(self, database) -> None:
        self.database = database

    def require_owned_base(self, *, user_id: str, knowledge_base_id: str) -> dict:
        document = self.database.knowledge_bases.find_one({"id": knowledge_base_id, "user_id": user_id, "status": {"$ne": "deleted"}})
        if document is None:
            raise KnowledgeBaseNotFound("知识库不存在")
        return document
```

- [ ] **Step 3: 运行测试并提交**

Run: `uv run pytest tests/unit/knowledge/test_repository.py -v`
Expected: PASS。

```bash
git add src/omnimind/knowledge tests/unit/knowledge/test_repository.py
git commit -m "知识库：建立私有知识库所有权模型"
```

### Task 2: RAGFlow HTTP adapter

**Files:**
- Create: `src/omnimind/knowledge/ragflow.py`
- Test: `tests/contract/test_ragflow_client.py`
- Modify: `.env.example`
- Modify: `src/omnimind/config.py`

**Interfaces:**
- Produces: `RagflowClient.create_dataset`、`upload_markdown`、`start_parse`、`get_document_status`、`retrieve`、`delete_dataset`。

- [ ] **Step 1: 写入 HTTP 契约测试**

```python
# tests/contract/test_ragflow_client.py
import httpx
import pytest
import respx
from omnimind.knowledge.ragflow import RagflowClient


@pytest.mark.asyncio
@respx.mock
async def test_create_dataset_normalizes_response() -> None:
    respx.post("http://ragflow/api/v1/datasets").mock(return_value=httpx.Response(200, json={"code": 0, "data": {"id": "ds1"}}))
    client = RagflowClient("http://ragflow", "token")
    assert await client.create_dataset("高等数学") == "ds1"


@pytest.mark.asyncio
@respx.mock
async def test_nonzero_code_raises_stable_error() -> None:
    respx.post("http://ragflow/api/v1/datasets").mock(return_value=httpx.Response(200, json={"code": 100, "message": "bad"}))
    with pytest.raises(RuntimeError, match="RAGFLOW_CREATE_DATASET_FAILED"):
        await RagflowClient("http://ragflow", "token").create_dataset("x")
```

- [ ] **Step 2: 实现 adapter 基础**

```python
# src/omnimind/knowledge/ragflow.py
import httpx


class RagflowClient:
    def __init__(self, base_url: str, api_key: str, timeout: float = 30.0) -> None:
        self._client = httpx.AsyncClient(base_url=base_url.rstrip("/"), headers={"Authorization": f"Bearer {api_key}"}, timeout=timeout)

    async def create_dataset(self, name: str) -> str:
        response = await self._client.post("/api/v1/datasets", json={"name": name})
        response.raise_for_status()
        body = response.json()
        if body.get("code") != 0:
            raise RuntimeError("RAGFLOW_CREATE_DATASET_FAILED")
        return str(body["data"]["id"])

    async def retrieve(self, *, question: str, dataset_ids: list[str], top_k: int = 8) -> list[dict]:
        response = await self._client.post("/api/v1/retrieval", json={"question": question, "dataset_ids": dataset_ids, "top_k": top_k})
        response.raise_for_status()
        body = response.json()
        if body.get("code") != 0:
            raise RuntimeError("RAGFLOW_RETRIEVAL_FAILED")
        return list(body.get("data", {}).get("chunks", []))
```

- [ ] **Step 3: 实现文档和解析方法的完整契约测试**

依据 RAGFlow v0.26.4 官方 HTTP API，为以下固定调用分别使用 `respx` 验证 method、path、auth header、请求体和响应规范化：

```text
POST   /api/v1/datasets/{dataset_id}/documents
POST   /api/v1/datasets/{dataset_id}/chunks
GET    /api/v1/datasets/{dataset_id}/documents?id={document_id}&page=1&page_size=1
DELETE /api/v1/datasets
```

上传使用 multipart 字段名 `file`；解析请求体为 `{"document_ids": [document_id]}`；删除请求体为 `{"ids": [dataset_id]}`。`get_document_status` 从列表响应中规范化 `run`、`progress`、`progress_msg`，文档不存在时抛出 `RAGFLOW_DOCUMENT_NOT_FOUND`。若实际响应与测试 fixture 不符，只修改 adapter 和 fixture，不泄漏到 service/MCP。

- [ ] **Step 4: 运行契约测试并提交**

Run: `uv run pytest tests/contract/test_ragflow_client.py -v`
Expected: PASS，且不访问真实网络。

```bash
git add src/omnimind/knowledge/ragflow.py src/omnimind/config.py .env.example tests/contract/test_ragflow_client.py
git commit -m "知识库：封装 RAGFlow 数据集和检索接口"
```

### Task 3: 会话多知识库装载

**Files:**
- Create: `src/omnimind/knowledge/mounts.py`
- Test: `tests/unit/knowledge/test_mounts.py`

**Interfaces:**
- Produces: `mount(user_id, thread_id, knowledge_base_ids)`、`unmount(...)`、`resolve_dataset_ids(...)`。

- [ ] **Step 1: 写入跨用户装载失败测试**

```python
# tests/unit/knowledge/test_mounts.py
import pytest
from omnimind.knowledge.mounts import KnowledgeMountService


def test_mount_rejects_base_not_owned_by_user(repository) -> None:
    repository.require_owned_base.side_effect = LookupError("知识库不存在")
    with pytest.raises(LookupError):
        KnowledgeMountService(repository).mount(user_id="u2", thread_id="t1", knowledge_base_ids=["kb1"])
```

- [ ] **Step 2: 实现装载 service**

```python
# src/omnimind/knowledge/mounts.py
class KnowledgeMountService:
    def __init__(self, repository) -> None:
        self.repository = repository

    def mount(self, *, user_id: str, thread_id: str, knowledge_base_ids: list[str]) -> list[str]:
        unique_ids = list(dict.fromkeys(knowledge_base_ids))
        for knowledge_base_id in unique_ids:
            self.repository.require_owned_base(user_id=user_id, knowledge_base_id=knowledge_base_id)
        self.repository.replace_mounts(user_id=user_id, thread_id=thread_id, knowledge_base_ids=unique_ids)
        return unique_ids

    def resolve_dataset_ids(self, *, user_id: str, thread_id: str) -> list[str]:
        bases = self.repository.list_mounted_bases(user_id=user_id, thread_id=thread_id)
        return [str(base["ragflow_dataset_id"]) for base in bases]
```

- [ ] **Step 3: 运行测试并提交**

Run: `uv run pytest tests/unit/knowledge/test_mounts.py -v`
Expected: PASS。

```bash
git add src/omnimind/knowledge/mounts.py tests/unit/knowledge/test_mounts.py
git commit -m "知识库：支持会话装载多个私有知识库"
```

### Task 4: 知识库 MCP 与来源规范化

**Files:**
- Create: `src/omnimind/knowledge/search.py`
- Create: `src/omnimind/mcp/knowledge_server.py`
- Test: `tests/unit/knowledge/test_search.py`
- Test: `tests/contract/test_knowledge_mcp.py`

**Interfaces:**
- Produces: `list_knowledge_bases`、`mount_knowledge_bases`、`unmount_knowledge_bases`、`search_knowledge`、`get_document_sources`。

- [ ] **Step 1: 写入服务端范围推导测试**

```python
# tests/unit/knowledge/test_search.py
import pytest
from omnimind.knowledge.search import KnowledgeSearchService


@pytest.mark.asyncio
async def test_search_uses_only_resolved_dataset_ids(mounts, ragflow) -> None:
    mounts.resolve_dataset_ids.return_value = ["ds-owned"]
    ragflow.retrieve.return_value = []
    await KnowledgeSearchService(mounts, ragflow).search(user_id="u1", thread_id="t1", query="极限")
    ragflow.retrieve.assert_awaited_once_with(question="极限", dataset_ids=["ds-owned"], top_k=8)
```

- [ ] **Step 2: 实现检索结果模型**

```python
# src/omnimind/knowledge/search.py
from pydantic import BaseModel, Field


class KnowledgeSource(BaseModel):
    content: str
    document_name: str
    section: str | None = None
    page: int | None = None
    image_urls: list[str] = Field(default_factory=list)
    score: float


class KnowledgeSearchService:
    def __init__(self, mounts, ragflow) -> None:
        self.mounts, self.ragflow = mounts, ragflow

    async def search(self, *, user_id: str, thread_id: str, query: str, top_k: int = 8) -> list[KnowledgeSource]:
        dataset_ids = self.mounts.resolve_dataset_ids(user_id=user_id, thread_id=thread_id)
        if not dataset_ids:
            return []
        chunks = await self.ragflow.retrieve(question=query, dataset_ids=dataset_ids, top_k=top_k)
        return [KnowledgeSource(content=row["content_with_weight"], document_name=row["document_keyword"], section=row.get("section_keyword"), page=row.get("page_num"), image_urls=row.get("image_urls", []), score=float(row.get("similarity", 0))) for row in chunks]
```

- [ ] **Step 3: 暴露五个 MCP 工具并验证名称**

```python
# tests/contract/test_knowledge_mcp.py
from omnimind.mcp.knowledge_server import mcp


def test_knowledge_mcp_tool_names() -> None:
    assert {tool.name for tool in mcp._tool_manager.list_tools()} == {"list_knowledge_bases", "mount_knowledge_bases", "unmount_knowledge_bases", "search_knowledge", "get_document_sources"}
```

MCP 工具只接收业务 `knowledge_base_id`；`search_knowledge` 参数为 `user_id`、`thread_id`、`query`、`top_k=8`，不提供 `dataset_ids` 参数。

- [ ] **Step 4: 运行测试并提交**

Run: `uv run pytest tests/unit/knowledge tests/contract/test_knowledge_mcp.py -v`
Expected: PASS。

```bash
git add src/omnimind/knowledge src/omnimind/mcp/knowledge_server.py tests/unit/knowledge tests/contract/test_knowledge_mcp.py
git commit -m "知识库：提供受控装载和检索工具"
```
