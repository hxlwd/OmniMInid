# OmniMind 平台基座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从官方 `new-langgraph-project` 模板建立可启动、可测试、可连接 MongoDB 的 Python/LangGraph 项目基座。

**Architecture:** 保留模板的 `src/agent/graph.py` 和 `langgraph.json` 入口，在 `src/omnimind/` 中承载配置、模型、数据库与 API 通用能力。所有外部连接通过依赖工厂创建，测试使用内存替身。

**Tech Stack:** Python 3.12、uv、LangGraph 1.x、Deep Agents 0.6.x、FastAPI、Pydantic Settings、PyMongo、MongoDBSaver、pytest、ruff、mypy。

## Global Constraints

- 以 `langchain-ai/new-langgraph-project` 当前 `main` 模板为基线，保留 `src/agent`、`tests`、`langgraph.json`、`pyproject.toml` 和 `uv.lock` 的模板习惯。
- RAGFlow 固定为 `v0.26.4`，应用服务不下载本地语言或视觉模型权重。
- 模型 API Key、SSH 密码、数据库密码和 MinIO 密钥只通过环境变量或 Docker Secret 注入。
- `.env.example` 只能包含占位符；日志必须对 `sk-` Key、Bearer Token 和连接串脱敏。
- README、项目文档和 Git 提交信息默认使用中文。
- 每个任务按测试先行实施，提交前运行 `uv run ruff check .`、`uv run mypy src` 和相关 pytest。

---

### Task 1: 导入官方模板骨架并建立依赖基线

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `pyproject.toml`
- Create: `langgraph.json`
- Create: `src/agent/__init__.py`
- Create: `src/agent/graph.py`
- Create: `tests/unit/test_template_contract.py`
- Generate: `uv.lock`

**Interfaces:**
- Consumes: 已清空且仅保留文档的 Git 仓库。
- Produces: `agent.graph:graph` LangGraph 入口、统一 Python 依赖和质量命令。

- [ ] **Step 1: 拉取模板到临时目录并记录来源提交**

Run:

```powershell
git clone --depth 1 https://github.com/langchain-ai/new-langgraph-project.git .template/new-langgraph-project
git -C .template/new-langgraph-project rev-parse HEAD
```

Expected: 输出 40 位模板提交 SHA。将 SHA 写入后续提交说明，不复制模板 README 覆盖项目中文 README。

- [ ] **Step 2: 写入失败的模板契约测试**

```python
# tests/unit/test_template_contract.py
import json
from pathlib import Path


def test_langgraph_manifest_points_to_agent_graph() -> None:
    manifest = json.loads(Path("langgraph.json").read_text(encoding="utf-8"))
    assert manifest["graphs"] == {"agent": "./src/agent/graph.py:graph"}


def test_env_example_contains_placeholders_only() -> None:
    content = Path(".env.example").read_text(encoding="utf-8")
    assert "DEEPSEEK_API_KEY=" in content
    assert "QWEN_API_KEY=" in content
    assert "sk-" not in content
```

- [ ] **Step 3: 运行测试确认失败**

Run: `uv run pytest tests/unit/test_template_contract.py -v`
Expected: FAIL，原因是 `pyproject.toml` 或 `langgraph.json` 尚不存在。

- [ ] **Step 4: 写入最小项目配置**

```toml
# pyproject.toml
[project]
name = "omnimind"
version = "0.1.0"
description = "面向课程与考试场景的个人智能学习 Agent"
readme = "README.md"
requires-python = ">=3.12,<3.13"
dependencies = [
  "charset-normalizer>=3.4,<4",
  "deepagents>=0.6,<0.7",
  "fastapi>=0.116,<1",
  "httpx>=0.28,<1",
  "langchain-openai>=1.1,<2",
  "langgraph>=1.0,<2",
  "langgraph-checkpoint-mongodb>=0.3,<1",
  "mcp>=1.13,<2",
  "minio>=7.2,<8",
  "opensandbox>=0.1,<1",
  "pydantic>=2.11,<3",
  "pydantic-settings>=2.10,<3",
  "pymongo>=4.14,<5",
  "python-multipart>=0.0.20,<1",
  "pyyaml>=6.0,<7",
  "uvicorn[standard]>=0.35,<1",
]

[dependency-groups]
dev = [
  "mypy>=1.17,<2",
  "pytest>=8.4,<9",
  "pytest-asyncio>=1.1,<2",
  "pytest-cov>=6.2,<7",
  "freezegun>=1.5,<2",
  "respx>=0.22,<1",
  "ruff>=0.12,<1",
  "testcontainers>=4.13,<5",
]

[build-system]
requires = ["setuptools>=80", "wheel"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP"]

[tool.mypy]
python_version = "3.12"
strict = true
packages = ["agent", "omnimind"]
```

```json
// langgraph.json
{
  "dependencies": ["."],
  "graphs": {"agent": "./src/agent/graph.py:graph"},
  "env": ".env"
}
```

```dotenv
# .env.example
APP_ENV=development
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MAIN_MODEL=deepseek-v4-pro
DEEPSEEK_SUMMARY_MODEL=deepseek-v4-flash
QWEN_API_KEY=
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_VISION_MODEL=qwen3.5-flash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=omnimind
```

```gitignore
# .gitignore
.env
.venv/
__pycache__/
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
htmlcov/
dist/
node_modules/
.template/
tmp/
```

```python
# src/agent/__init__.py
"""LangGraph 可发现的 OmniMind Agent 包。"""
```

```python
# src/agent/graph.py
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import MessagesState


def _placeholder(state: MessagesState) -> MessagesState:
    return state


_builder = StateGraph(MessagesState)
_builder.add_node("placeholder", _placeholder)
_builder.add_edge(START, "placeholder")
_builder.add_edge("placeholder", END)
graph = _builder.compile()
```

- [ ] **Step 5: 锁定依赖并运行基线检查**

Run:

```powershell
uv lock
uv sync --all-groups
uv run pytest tests/unit/test_template_contract.py -v
uv run ruff check .
```

Expected: 2 tests PASS，ruff 输出 `All checks passed!`。

- [ ] **Step 6: 提交模板基线**

```bash
git add .gitignore .env.example pyproject.toml uv.lock langgraph.json src/agent tests/unit/test_template_contract.py
git commit -m "基础：建立 LangGraph 项目模板"
```

### Task 2: 类型化配置、运行时上下文与脱敏

**Files:**
- Create: `src/omnimind/__init__.py`
- Create: `src/omnimind/config.py`
- Create: `src/omnimind/context.py`
- Create: `src/omnimind/logging.py`
- Test: `tests/unit/test_config.py`
- Test: `tests/unit/test_context.py`

**Interfaces:**
- Consumes: 环境变量。
- Produces: `Settings`、`RuntimeContext`、`redact_secrets(text: str) -> str`。

- [ ] **Step 1: 写入配置和上下文失败测试**

```python
# tests/unit/test_config.py
from omnimind.config import Settings
from omnimind.logging import redact_secrets


def test_settings_use_current_model_defaults() -> None:
    settings = Settings(_env_file=None, deepseek_api_key="test", qwen_api_key="test")
    assert settings.deepseek_main_model == "deepseek-v4-pro"
    assert settings.deepseek_summary_model == "deepseek-v4-flash"
    assert settings.qwen_vision_model == "qwen3.5-flash"


def test_redaction_removes_keys_and_bearer_tokens() -> None:
    raw = "key=" + "sk-" + "abcdefghijklmnopqrstuvwxyz Bearer abc.def.ghi"
    assert redact_secrets(raw) == "key=sk-*** Bearer ***"
```

```python
# tests/unit/test_context.py
import pytest
from pydantic import ValidationError
from omnimind.context import RuntimeContext


def test_user_id_accepts_safe_test_identifier() -> None:
    assert RuntimeContext(user_id="student_001").user_id == "student_001"


def test_user_id_rejects_path_characters() -> None:
    with pytest.raises(ValidationError):
        RuntimeContext(user_id="../other-user")
```

- [ ] **Step 2: 运行测试确认模块缺失**

Run: `uv run pytest tests/unit/test_config.py tests/unit/test_context.py -v`
Expected: collection ERROR，`No module named 'omnimind'`。

- [ ] **Step 3: 实现配置和上下文**

```python
# src/omnimind/config.py
from functools import lru_cache
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: str = "development"
    deepseek_api_key: SecretStr
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_main_model: str = "deepseek-v4-pro"
    deepseek_summary_model: str = "deepseek-v4-flash"
    qwen_api_key: SecretStr
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_vision_model: str = "qwen3.5-flash"
    mongodb_uri: SecretStr = SecretStr("mongodb://localhost:27017")
    mongodb_database: str = "omnimind"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
```

```python
# src/omnimind/context.py
from pydantic import BaseModel, Field


class RuntimeContext(BaseModel):
    user_id: str = Field(pattern=r"^[A-Za-z0-9._-]{1,64}$")
    timezone: str = "Asia/Shanghai"
    debug_events: bool = False
```

```python
# src/omnimind/logging.py
import re

_KEY = re.compile(r"sk-[A-Za-z0-9_-]{12,}")
_BEARER = re.compile(r"Bearer\s+[^\s]+", re.IGNORECASE)


def redact_secrets(text: str) -> str:
    return _BEARER.sub("Bearer ***", _KEY.sub("sk-***", text))
```

- [ ] **Step 4: 运行测试和静态检查**

Run: `uv run pytest tests/unit/test_config.py tests/unit/test_context.py -v && uv run mypy src`
Expected: 4 tests PASS，mypy 无错误。

- [ ] **Step 5: 提交配置基线**

```bash
git add src/omnimind tests/unit/test_config.py tests/unit/test_context.py
git commit -m "基础：增加运行配置和用户上下文"
```

### Task 3: MongoDB 生命周期与 checkpoint 工厂

**Files:**
- Create: `src/omnimind/persistence/mongo.py`
- Create: `src/omnimind/persistence/__init__.py`
- Test: `tests/unit/persistence/test_mongo.py`
- Test: `tests/integration/test_mongo_checkpoint.py`

**Interfaces:**
- Consumes: `Settings.mongodb_uri`、`Settings.mongodb_database`。
- Produces: `MongoRuntime.client`、`MongoRuntime.database`、`MongoRuntime.checkpointer`、`ensure_indexes()`。

- [ ] **Step 1: 写入可注入客户端的失败测试**

```python
# tests/unit/persistence/test_mongo.py
from unittest.mock import MagicMock
from omnimind.persistence.mongo import MongoRuntime


def test_runtime_uses_named_database() -> None:
    client = MagicMock()
    runtime = MongoRuntime(client=client, database_name="omnimind_test")
    assert runtime.database is client["omnimind_test"]
```

- [ ] **Step 2: 运行测试确认失败**

Run: `uv run pytest tests/unit/persistence/test_mongo.py -v`
Expected: collection ERROR，`omnimind.persistence.mongo` 不存在。

- [ ] **Step 3: 实现 Mongo 生命周期对象**

```python
# src/omnimind/persistence/mongo.py
from dataclasses import dataclass
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database


@dataclass(slots=True)
class MongoRuntime:
    client: MongoClient
    database_name: str

    @property
    def database(self) -> Database:
        return self.client[self.database_name]

    def ensure_indexes(self) -> None:
        self.database.study_tasks.create_index(
            [("user_id", ASCENDING), ("plan_id", ASCENDING), ("position", ASCENDING)],
            unique=True,
        )
        self.database.notifications.create_index(
            [("user_id", ASCENDING), ("status", ASCENDING), ("due_at", ASCENDING)]
        )
        self.database.ingestion_jobs.create_index(
            [("status", ASCENDING), ("lease_until", ASCENDING), ("created_at", ASCENDING)]
        )
        self.database.learning_events.create_index(
            [("user_id", ASCENDING), ("created_at", DESCENDING)]
        )
```

- [ ] **Step 4: 增加真实 Mongo checkpoint 集成测试**

```python
# tests/integration/test_mongo_checkpoint.py
import os
import pytest
from langgraph.checkpoint.mongodb import MongoDBSaver


@pytest.mark.skipif("TEST_MONGODB_URI" not in os.environ, reason="需要测试 MongoDB")
def test_mongodb_saver_round_trip() -> None:
    uri = os.environ["TEST_MONGODB_URI"]
    with MongoDBSaver.from_conn_string(uri, db_name="omnimind_test") as saver:
        config = {"configurable": {"thread_id": "thread-1"}}
        saver.put(config, {"v": 1, "ts": "", "id": "checkpoint-1", "channel_values": {}}, {}, {})
        assert saver.get(config) is not None
```

- [ ] **Step 5: 运行单元测试；有 Mongo 时运行集成测试**

Run: `uv run pytest tests/unit/persistence/test_mongo.py -v`
Expected: PASS。

Run: `uv run pytest tests/integration/test_mongo_checkpoint.py -v`
Expected: 未配置环境变量时 SKIP；配置后 PASS。

- [ ] **Step 6: 提交持久化基线**

```bash
git add src/omnimind/persistence tests/unit/persistence tests/integration/test_mongo_checkpoint.py
git commit -m "基础：接入 MongoDB 持久化运行时"
```

### Task 4: FastAPI 健康检查与应用生命周期

**Files:**
- Create: `src/omnimind/api/app.py`
- Create: `src/omnimind/api/__init__.py`
- Test: `tests/unit/api/test_health.py`
- Modify: `pyproject.toml`

**Interfaces:**
- Consumes: `MongoRuntime`。
- Produces: `create_app() -> FastAPI`、`GET /health/live`、`GET /health/ready`。

- [ ] **Step 1: 写入失败的健康检查测试**

```python
# tests/unit/api/test_health.py
from fastapi.testclient import TestClient
from omnimind.api.app import create_app


def test_liveness_does_not_depend_on_external_services() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `uv run pytest tests/unit/api/test_health.py -v`
Expected: collection ERROR，`omnimind.api.app` 不存在。

- [ ] **Step 3: 实现应用工厂**

```python
# src/omnimind/api/app.py
from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="OmniMind API", version="0.1.0")

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready")
    async def ready() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
```

- [ ] **Step 4: 运行全量基线检查**

Run: `uv run pytest -v && uv run ruff check . && uv run mypy src`
Expected: 单元测试 PASS，Mongo 集成测试按环境 PASS 或 SKIP，ruff/mypy 无错误。

- [ ] **Step 5: 提交 API 基线**

```bash
git add src/omnimind/api tests/unit/api pyproject.toml uv.lock
git commit -m "基础：增加 API 生命周期和健康检查"
```
