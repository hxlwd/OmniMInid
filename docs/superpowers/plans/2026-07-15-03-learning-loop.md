# OmniMind 学习闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现学习计划、任务、学习事件、确定性复习策略、到期通知和供 Agent 调用的学习 MCP。

**Architecture:** 领域模型与 Mongo repository 分离；Agent 只能通过 service/MCP 修改状态。独立 scheduler 使用唯一通知键扫描到期复习项，所有时间以 UTC 持久化。

**Tech Stack:** Pydantic、PyMongo、FastMCP/LangChain MCP adapters、FastAPI、pytest、freezegun。

## Global Constraints

- `user_id` 必须出现在每个用户业务文档和每条 repository 查询中。
- Agent 只提交 `Again`、`Hard`、`Good`、`Easy`，不得自行计算复习日期。
- 默认时区为 `Asia/Shanghai`，数据库统一保存 UTC aware datetime。
- 计划修订创建新版本，不覆盖历史版本。
- 通知只显示在测试 UI，不发送外部渠道。
- 提交信息和用户可见错误使用中文。

---

### Task 1: 学习领域模型与 Mongo repository

**Files:**
- Create: `src/omnimind/learning/models.py`
- Create: `src/omnimind/learning/repository.py`
- Create: `src/omnimind/learning/__init__.py`
- Test: `tests/unit/learning/test_models.py`
- Test: `tests/integration/learning/test_repository.py`

**Interfaces:**
- Produces: `StudyPlan`、`StudyTask`、`LearningEvent`、`ReviewItem`、`Notification`、`LearningRepository`。

- [ ] **Step 1: 写入领域约束测试**

```python
# tests/unit/learning/test_models.py
from datetime import UTC, datetime
import pytest
from pydantic import ValidationError
from omnimind.learning.models import ReviewGrade, ReviewItem, StudyTask


def test_task_requires_positive_minutes() -> None:
    with pytest.raises(ValidationError):
        StudyTask(user_id="u1", plan_id="p1", position=1, title="数学", estimated_minutes=0)


def test_review_item_requires_utc_due_at() -> None:
    item = ReviewItem(
        user_id="u1", knowledge_key="limits", due_at=datetime(2026, 7, 15, tzinfo=UTC)
    )
    assert item.grade is None
    assert set(ReviewGrade) == {
        ReviewGrade.AGAIN, ReviewGrade.HARD, ReviewGrade.GOOD, ReviewGrade.EASY
    }
```

- [ ] **Step 2: 实现领域模型**

```python
# src/omnimind/learning/models.py
from datetime import UTC, date, datetime
from enum import StrEnum
from pydantic import BaseModel, Field, field_validator


class ReviewGrade(StrEnum):
    AGAIN = "Again"
    HARD = "Hard"
    GOOD = "Good"
    EASY = "Easy"


class StudyPlan(BaseModel):
    id: str
    user_id: str
    title: str
    objective: str
    target_date: date
    version: int = Field(ge=1)
    status: str = "active"


class StudyTask(BaseModel):
    id: str | None = None
    user_id: str
    plan_id: str
    position: int = Field(ge=1)
    title: str
    estimated_minutes: int = Field(gt=0)
    status: str = "pending"


class LearningEvent(BaseModel):
    id: str | None = None
    user_id: str
    event_type: str
    knowledge_key: str | None = None
    payload: dict[str, object] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ReviewItem(BaseModel):
    id: str | None = None
    user_id: str
    knowledge_key: str
    due_at: datetime
    interval_days: float = 0.0
    repetitions: int = 0
    grade: ReviewGrade | None = None

    @field_validator("due_at")
    @classmethod
    def due_at_must_be_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("due_at 必须包含时区")
        return value.astimezone(UTC)


class Notification(BaseModel):
    id: str | None = None
    user_id: str
    review_item_id: str
    due_at: datetime
    status: str = "pending"
```

- [ ] **Step 3: 实现 repository 所有权查询**

```python
# src/omnimind/learning/repository.py
from datetime import datetime
from pymongo.database import Database


class LearningRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    def insert_plan(self, document: dict) -> str:
        return str(self._db.study_plans.insert_one(document).inserted_id)

    def insert_tasks(self, documents: list[dict]) -> list[str]:
        if not documents:
            return []
        return [str(value) for value in self._db.study_tasks.insert_many(documents).inserted_ids]

    def list_tasks(self, *, user_id: str, plan_id: str) -> list[dict]:
        return list(self._db.study_tasks.find({"user_id": user_id, "plan_id": plan_id}).sort("position", 1))

    def due_reviews(self, *, now: datetime, limit: int = 100) -> list[dict]:
        return list(self._db.review_items.find({"due_at": {"$lte": now}, "status": "active"}).limit(limit))

    def create_notification_once(self, document: dict) -> bool:
        result = self._db.notifications.update_one(
            {"user_id": document["user_id"], "review_item_id": document["review_item_id"], "due_at": document["due_at"]},
            {"$setOnInsert": document},
            upsert=True,
        )
        return result.upserted_id is not None
```

- [ ] **Step 4: 写入集成测试证明用户隔离**

```python
# tests/integration/learning/test_repository.py
def test_list_tasks_filters_user(mongo_database) -> None:
    mongo_database.study_tasks.insert_many([
        {"user_id": "u1", "plan_id": "p1", "position": 1},
        {"user_id": "u2", "plan_id": "p1", "position": 1},
    ])
    from omnimind.learning.repository import LearningRepository
    rows = LearningRepository(mongo_database).list_tasks(user_id="u1", plan_id="p1")
    assert [row["user_id"] for row in rows] == ["u1"]
```

- [ ] **Step 5: 运行测试并提交**

Run: `uv run pytest tests/unit/learning tests/integration/learning -v`
Expected: 单元测试 PASS；Mongo fixture 可用时集成测试 PASS。

```bash
git add src/omnimind/learning tests/unit/learning tests/integration/learning
git commit -m "学习：建立学习领域模型和数据仓库"
```

### Task 2: 确定性复习策略

**Files:**
- Create: `src/omnimind/learning/review_policy.py`
- Test: `tests/unit/learning/test_review_policy.py`

**Interfaces:**
- Consumes: `ReviewItem`、`ReviewGrade`、UTC `reviewed_at`。
- Produces: `ReviewSchedule(due_at, interval_days, repetitions)`。

- [ ] **Step 1: 写入四级结果测试**

```python
# tests/unit/learning/test_review_policy.py
from datetime import UTC, datetime, timedelta
from omnimind.learning.models import ReviewGrade, ReviewItem
from omnimind.learning.review_policy import ReviewPolicy

NOW = datetime(2026, 7, 15, 0, 0, tzinfo=UTC)


def test_again_resets_interval() -> None:
    item = ReviewItem(user_id="u", knowledge_key="k", due_at=NOW, interval_days=10, repetitions=3)
    result = ReviewPolicy().schedule(item, ReviewGrade.AGAIN, NOW)
    assert result.due_at == NOW + timedelta(days=1)
    assert result.repetitions == 0


def test_good_grows_interval() -> None:
    item = ReviewItem(user_id="u", knowledge_key="k", due_at=NOW, interval_days=4, repetitions=2)
    result = ReviewPolicy().schedule(item, ReviewGrade.GOOD, NOW)
    assert result.interval_days == 10


def test_easy_grows_faster_than_hard() -> None:
    item = ReviewItem(user_id="u", knowledge_key="k", due_at=NOW, interval_days=4, repetitions=2)
    policy = ReviewPolicy()
    assert policy.schedule(item, ReviewGrade.EASY, NOW).due_at > policy.schedule(item, ReviewGrade.HARD, NOW).due_at
```

- [ ] **Step 2: 实现复习策略**

```python
# src/omnimind/learning/review_policy.py
from dataclasses import dataclass
from datetime import datetime, timedelta
from omnimind.learning.models import ReviewGrade, ReviewItem


@dataclass(frozen=True, slots=True)
class ReviewSchedule:
    due_at: datetime
    interval_days: float
    repetitions: int


class ReviewPolicy:
    def schedule(self, item: ReviewItem, grade: ReviewGrade, reviewed_at: datetime) -> ReviewSchedule:
        if grade is ReviewGrade.AGAIN:
            interval, repetitions = 1.0, 0
        elif grade is ReviewGrade.HARD:
            interval, repetitions = max(2.0, item.interval_days * 1.5), item.repetitions + 1
        elif grade is ReviewGrade.GOOD:
            interval, repetitions = max(3.0, item.interval_days * 2.5), item.repetitions + 1
        else:
            interval, repetitions = max(5.0, item.interval_days * 4.0), item.repetitions + 1
        return ReviewSchedule(reviewed_at + timedelta(days=interval), interval, repetitions)
```

- [ ] **Step 3: 运行测试并提交**

Run: `uv run pytest tests/unit/learning/test_review_policy.py -v`
Expected: 3 tests PASS。

```bash
git add src/omnimind/learning/review_policy.py tests/unit/learning/test_review_policy.py
git commit -m "学习：实现确定性复习间隔策略"
```

### Task 3: 学习 service 与 MCP 工具

**Files:**
- Create: `src/omnimind/learning/service.py`
- Create: `src/omnimind/mcp/learning_server.py`
- Create: `src/omnimind/mcp/__init__.py`
- Test: `tests/unit/learning/test_service.py`
- Test: `tests/contract/test_learning_mcp.py`

**Interfaces:**
- Produces: `create_study_plan`、`revise_study_plan`、`list_study_progress`、`record_learning_event`、`list_due_reviews`、`record_review_result`。

- [ ] **Step 1: 写入 service 失败测试**

```python
# tests/unit/learning/test_service.py
from unittest.mock import MagicMock
from omnimind.learning.service import LearningService


def test_create_plan_injects_user_into_every_task() -> None:
    repository = MagicMock()
    service = LearningService(repository)
    service.create_plan(user_id="u1", title="高数", objective="通过考试", target_date="2026-12-01", tasks=[{"title": "极限", "estimated_minutes": 45}])
    saved = repository.insert_tasks.call_args.args[0]
    assert saved[0]["user_id"] == "u1"
```

- [ ] **Step 2: 实现 service 的原子写入边界**

```python
# src/omnimind/learning/service.py
from datetime import date
from uuid import uuid4


class LearningService:
    def __init__(self, repository) -> None:
        self.repository = repository

    def create_plan(self, *, user_id: str, title: str, objective: str, target_date: str, tasks: list[dict]) -> dict:
        plan_id = str(uuid4())
        plan = {"id": plan_id, "user_id": user_id, "title": title, "objective": objective, "target_date": date.fromisoformat(target_date), "version": 1, "status": "active"}
        rows = [{"id": str(uuid4()), "user_id": user_id, "plan_id": plan_id, "position": index, "status": "pending", **task} for index, task in enumerate(tasks, 1)]
        self.repository.insert_plan(plan)
        self.repository.insert_tasks(rows)
        return {"plan": plan, "tasks": rows}
```

- [ ] **Step 3: 暴露 MCP 工具并写契约测试**

```python
# src/omnimind/mcp/learning_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("omnimind-learning")


@mcp.tool()
def create_study_plan(user_id: str, title: str, objective: str, target_date: str, tasks: list[dict]) -> dict:
    """为当前用户创建结构化学习计划。"""
    from omnimind.runtime import learning_service
    return learning_service().create_plan(user_id=user_id, title=title, objective=objective, target_date=target_date, tasks=tasks)
```

```python
# tests/contract/test_learning_mcp.py
from omnimind.mcp.learning_server import mcp


def test_learning_mcp_exposes_required_tools() -> None:
    names = {tool.name for tool in mcp._tool_manager.list_tools()}
    assert names == {"create_study_plan", "revise_study_plan", "list_study_progress", "record_learning_event", "list_due_reviews", "record_review_result"}
```

在同一模块中实现以下六个显式工具，禁止 `**kwargs` 和任意字典透传：

| 工具 | 固定参数 | service 调用与返回值 |
|---|---|---|
| `create_study_plan` | `user_id,title,objective,target_date,tasks` | `LearningService.create_plan(...)`，返回 plan 与 tasks |
| `revise_study_plan` | `user_id,plan_id,expected_version,patch` | 所有权过滤后乐观锁更新，版本冲突抛出 `PLAN_VERSION_CONFLICT` |
| `list_study_progress` | `user_id,plan_id` | 返回任务完成数、总数、逾期数和下一任务 |
| `record_learning_event` | `user_id,thread_id,knowledge_key,event_type,evidence` | 写入事件并 upsert 对应 `review_item` |
| `list_due_reviews` | `user_id,as_of,limit=20` | 仅返回该用户 `due_at <= as_of` 的 active 项 |
| `record_review_result` | `user_id,review_item_id,grade,reviewed_at` | 调用 `ReviewPolicy`，在同一更新中写 grade、interval_days、repetitions、due_at 与 last_reviewed_at |

为每个工具写一条契约测试，断言参数 schema 必含 `user_id`；另外用用户 B 调用用户 A 的 plan/review ID，断言 service 抛出 `LookupError`。

- [ ] **Step 4: 运行测试并提交**

Run: `uv run pytest tests/unit/learning/test_service.py tests/contract/test_learning_mcp.py -v`
Expected: PASS。

```bash
git add src/omnimind/learning src/omnimind/mcp tests/unit/learning tests/contract/test_learning_mcp.py
git commit -m "学习：提供计划和复习 MCP 工具"
```

### Task 4: 独立复习调度器和通知 API

**Files:**
- Create: `src/omnimind/scheduler/reviews.py`
- Create: `src/omnimind/scheduler/__main__.py`
- Create: `src/omnimind/api/routes/notifications.py`
- Modify: `src/omnimind/api/app.py`
- Test: `tests/unit/scheduler/test_reviews.py`
- Test: `tests/unit/api/test_notifications.py`

**Interfaces:**
- Produces: `run_review_scan(repository, now) -> int`、通知列表/已读/延期 API。

- [ ] **Step 1: 写入幂等扫描测试**

```python
# tests/unit/scheduler/test_reviews.py
from datetime import UTC, datetime
from unittest.mock import MagicMock
from omnimind.scheduler.reviews import run_review_scan


def test_scan_counts_only_new_notifications() -> None:
    repository = MagicMock()
    repository.due_reviews.return_value = [{"id": "r1", "user_id": "u1", "due_at": datetime(2026, 7, 15, tzinfo=UTC)}]
    repository.create_notification_once.side_effect = [True, False]
    now = datetime(2026, 7, 15, tzinfo=UTC)
    assert run_review_scan(repository, now) == 1
    assert run_review_scan(repository, now) == 0
```

- [ ] **Step 2: 实现扫描器**

```python
# src/omnimind/scheduler/reviews.py
from datetime import datetime


def run_review_scan(repository, now: datetime) -> int:
    created = 0
    for item in repository.due_reviews(now=now):
        created += int(repository.create_notification_once({
            "user_id": item["user_id"],
            "review_item_id": str(item["id"]),
            "due_at": item["due_at"],
            "status": "pending",
        }))
    return created
```

- [ ] **Step 3: 实现通知路由与所有权测试**

路由固定为：

```text
GET  /v1/notifications?user_id={user_id}
POST /v1/notifications/{notification_id}/read
POST /v1/notifications/{notification_id}/defer
POST /v1/notifications/{notification_id}/complete
```

列表从 `X-OmniMind-User` header 取得 `user_id`，不接受 query 中覆盖身份。三个动作的 JSON 契约固定为：`read={}`、`defer={"until":"ISO-8601 UTC"}`、`complete={"review_grade":"again|hard|good|easy"}`。每条 update filter 必须同时包含 `{"id": notification_id, "user_id": user_id}`；没有匹配项统一返回 404。延期同时更新 notification 与 review item 的 `due_at`，完成动作复用 `record_review_result`，禁止路由自行计算间隔。测试使用用户 A 的通知 ID 和用户 B header 调用三个动作，全部期望 404。

- [ ] **Step 4: 运行测试并提交**

Run: `uv run pytest tests/unit/scheduler tests/unit/api/test_notifications.py -v`
Expected: PASS。

```bash
git add src/omnimind/scheduler src/omnimind/api tests/unit/scheduler tests/unit/api/test_notifications.py
git commit -m "学习：增加到期复习通知调度器"
```
