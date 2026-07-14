# OmniMind Agent Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立由 YAML 子 Agent、skills、工具注册表、OpenSandbox 与 Deep Agents 主 Agent 组成的唯一 Agent 运行时。

**Architecture:** YAML 只声明业务 Agent；加载器完成严格校验并解析工具与 skill。`create_deep_agent` 负责规划、文件系统、上下文压缩和委派，权限由工具白名单和 OpenSandbox 执行。

**Tech Stack:** Deep Agents 0.6.x、LangChain、Pydantic、PyYAML、OpenSandbox、MongoDBSaver、pytest。

## Global Constraints

- 子 Agent YAML 必须包含 `name`、`description`、`tools`、`skills`、`system_prompt`。
- 首版子 Agent 固定为 `socratic-tutor`、`study-planner`、`review-coach`。
- 业务策略优先写入 prompts、YAML、skills 和 MCP 工具，不新增自定义业务图节点。
- 未知工具、重复 Agent 名称和不存在的 skill 必须阻止启动。
- 调试事件不得包含隐藏思维链或真实密钥。
- 所有提交信息使用中文。

---

### Task 1: YAML schema 与严格加载器

**Files:**
- Create: `src/agent/subagents/schema.py`
- Create: `src/agent/subagents/loader.py`
- Create: `src/agent/subagents/__init__.py`
- Test: `tests/unit/agent/test_subagent_loader.py`

**Interfaces:**
- Consumes: `Path` 指向 YAML 目录。
- Produces: `SubAgentConfig`、`load_subagent_configs(path: Path) -> list[SubAgentConfig]`。

- [ ] **Step 1: 写入失败测试**

```python
# tests/unit/agent/test_subagent_loader.py
from pathlib import Path
import pytest
from pydantic import ValidationError
from agent.subagents.loader import load_subagent_configs


def test_loader_reads_required_fields(tmp_path: Path) -> None:
    (tmp_path / "tutor.yaml").write_text(
        """name: socratic-tutor
description: 引导学习
tools: [search_knowledge]
skills: [/skills/learning/socratic-teaching/]
system_prompt: 先诊断再提示
""",
        encoding="utf-8",
    )
    loaded = load_subagent_configs(tmp_path)
    assert loaded[0].name == "socratic-tutor"


def test_loader_rejects_duplicate_names(tmp_path: Path) -> None:
    body = "name: same\ndescription: x\ntools: []\nskills: []\nsystem_prompt: x\n"
    (tmp_path / "a.yaml").write_text(body, encoding="utf-8")
    (tmp_path / "b.yaml").write_text(body, encoding="utf-8")
    with pytest.raises(ValueError, match="重复"):
        load_subagent_configs(tmp_path)


def test_loader_rejects_missing_system_prompt(tmp_path: Path) -> None:
    (tmp_path / "bad.yaml").write_text("name: bad\ndescription: x\ntools: []\nskills: []", encoding="utf-8")
    with pytest.raises(ValidationError):
        load_subagent_configs(tmp_path)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `uv run pytest tests/unit/agent/test_subagent_loader.py -v`
Expected: collection ERROR。

- [ ] **Step 3: 实现 schema 和加载器**

```python
# src/agent/subagents/schema.py
from pydantic import BaseModel, ConfigDict, Field


class SubAgentConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(pattern=r"^[a-z][a-z0-9-]{1,63}$")
    description: str = Field(min_length=1)
    tools: list[str]
    skills: list[str]
    system_prompt: str = Field(min_length=1)
```

```python
# src/agent/subagents/loader.py
from pathlib import Path
import yaml
from agent.subagents.schema import SubAgentConfig


def load_subagent_configs(directory: Path) -> list[SubAgentConfig]:
    configs = [
        SubAgentConfig.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))
        for path in sorted(directory.glob("*.yaml"))
    ]
    names = [config.name for config in configs]
    duplicates = sorted({name for name in names if names.count(name) > 1})
    if duplicates:
        raise ValueError(f"子 Agent 名称重复：{', '.join(duplicates)}")
    return configs
```

- [ ] **Step 4: 运行测试并提交**

Run: `uv run pytest tests/unit/agent/test_subagent_loader.py -v`
Expected: 3 tests PASS。

```bash
git add src/agent/subagents tests/unit/agent/test_subagent_loader.py
git commit -m "智能体：增加 YAML 子智能体加载器"
```

### Task 2: 工具注册表与安全解析

**Files:**
- Create: `src/agent/tools/registry.py`
- Create: `src/agent/tools/__init__.py`
- Test: `tests/unit/agent/test_tool_registry.py`

**Interfaces:**
- Consumes: `BaseTool` 或 callable 工具集合、YAML 中的工具名称。
- Produces: `ToolRegistry.resolve(names: list[str]) -> list[BaseTool | Callable]`。

- [ ] **Step 1: 写入未知工具失败测试**

```python
# tests/unit/agent/test_tool_registry.py
import pytest
from langchain_core.tools import tool
from agent.tools.registry import ToolRegistry


@tool
def echo(value: str) -> str:
    """回显输入。"""
    return value


def test_registry_resolves_in_declared_order() -> None:
    registry = ToolRegistry([echo])
    assert [item.name for item in registry.resolve(["echo"])] == ["echo"]


def test_registry_rejects_unknown_tool() -> None:
    with pytest.raises(ValueError, match="unknown"):
        ToolRegistry([echo]).resolve(["unknown"])
```

- [ ] **Step 2: 实现注册表**

```python
# src/agent/tools/registry.py
from collections.abc import Callable, Iterable
from langchain_core.tools import BaseTool


ToolLike = BaseTool | Callable[..., object]


class ToolRegistry:
    def __init__(self, tools: Iterable[ToolLike]) -> None:
        self._tools = {getattr(tool, "name", tool.__name__): tool for tool in tools}

    def resolve(self, names: list[str]) -> list[ToolLike]:
        missing = [name for name in names if name not in self._tools]
        if missing:
            raise ValueError(f"未知工具：{', '.join(missing)}")
        return [self._tools[name] for name in names]
```

- [ ] **Step 3: 运行测试并提交**

Run: `uv run pytest tests/unit/agent/test_tool_registry.py -v`
Expected: 2 tests PASS。

```bash
git add src/agent/tools tests/unit/agent/test_tool_registry.py
git commit -m "智能体：增加工具白名单注册表"
```

### Task 3: 三个子 Agent 配置与六个 skills

**Files:**
- Create: `src/agent/subagents/configs/socratic_tutor.yaml`
- Create: `src/agent/subagents/configs/study_planner.yaml`
- Create: `src/agent/subagents/configs/review_coach.yaml`
- Create: `skills/learning/socratic-teaching/SKILL.md`
- Create: `skills/learning/diagnostic-questioning/SKILL.md`
- Create: `skills/learning/study-plan-design/SKILL.md`
- Create: `skills/learning/active-recall/SKILL.md`
- Create: `skills/learning/spaced-repetition/SKILL.md`
- Create: `skills/learning/mastery-evaluation/SKILL.md`
- Test: `tests/unit/agent/test_builtin_configs.py`

**Interfaces:**
- Consumes: Task 1 loader 与 Task 2 registry。
- Produces: 三个可加载的官方 `SubAgent` 声明和六个只读 skill 目录。

- [ ] **Step 1: 写入内置配置契约测试**

```python
# tests/unit/agent/test_builtin_configs.py
from pathlib import Path
from agent.subagents.loader import load_subagent_configs


def test_builtin_subagents_are_complete() -> None:
    configs = load_subagent_configs(Path("src/agent/subagents/configs"))
    assert {config.name for config in configs} == {
        "socratic-tutor", "study-planner", "review-coach"
    }
    for config in configs:
        for skill in config.skills:
            local = Path(skill.removeprefix("/skills/"))
            assert (Path("skills") / local / "SKILL.md").is_file()
```

- [ ] **Step 2: 写入 YAML 配置**

```yaml
# src/agent/subagents/configs/socratic_tutor.yaml
name: socratic-tutor
description: 诊断知识卡点并通过逐级提示引导用户形成自己的答案。
tools: [search_knowledge, record_learning_event]
skills: [/skills/learning/socratic-teaching/, /skills/learning/diagnostic-questioning/]
system_prompt: |
  一次只提出一个核心问题。先诊断，再给最小提示；用户明确要求直接答案或多次失败后才完整讲解。
```

```yaml
# src/agent/subagents/configs/study_planner.yaml
name: study-planner
description: 根据目标日期、可用时间和当前基础生成并维护结构化学习计划。
tools: [create_study_plan, revise_study_plan, list_study_progress]
skills: [/skills/learning/study-plan-design/]
system_prompt: |
  缺少目标日期、每周可用时间或当前基础时先补齐信息。计划必须通过工具保存，不得只输出自然语言。
```

```yaml
# src/agent/subagents/configs/review_coach.yaml
name: review-coach
description: 对到期知识点执行主动回忆、变式提问和掌握度评估。
tools: [list_due_reviews, record_review_result, record_learning_event]
skills: [/skills/learning/active-recall/, /skills/learning/spaced-repetition/, /skills/learning/mastery-evaluation/]
system_prompt: |
  先要求用户主动回忆，再给提示。结束时只提交 Again、Hard、Good、Easy 之一，由工具计算下次日期。
```

- [ ] **Step 3: 为每个 skill 写入完整工作流**

每个 `SKILL.md` 使用以下固定结构；frontmatter 的 `name` 必须等于目录名，正文必须逐条写入下表规定的规则：

```markdown
---
name: socratic-teaching
description: 通过诊断、最小提示和变式复述帮助用户形成理解。
---

# 苏格拉底教学

1. 用一个问题确认用户当前理解。
2. 根据回答指出具体冲突，不评价人格或能力。
3. 依次使用轻提示、方向提示、关键步骤和完整讲解。
4. 每次只升级一级，并等待用户回答。
5. 用户理解后要求其用自己的话总结或完成一道变式。
6. 调用 `record_learning_event` 记录知识点、表现和后续复习建议。
```

| 文件 | description | 正文必须包含的完整规则 |
|---|---|---|
| `diagnostic-questioning/SKILL.md` | 用最少问题定位概念、步骤、迁移或表达层面的卡点。 | 先让用户复述目标；一次只测一个前置概念；用反例区分概念错误与计算失误；最多连续问三个诊断问题；定位后输出“已掌握/不确定/缺失”的证据；把缺失项交给苏格拉底提示阶梯。 |
| `study-plan-design/SKILL.md` | 把考试或课程目标拆成受容量约束的可调整学习计划。 | 必须收集目标日期、每周可用分钟、当前基础和资料范围；任务粒度为 25–90 分钟；每周预留 20% 缓冲；前置知识先于依赖任务；每个任务含完成标准和复习入口；总分钟超出容量时先缩小范围并向用户说明；只通过 `create_study_plan` 或 `revise_study_plan` 持久化。 |
| `active-recall/SKILL.md` | 通过无提示回忆、线索和变式题完成一次复习。 | 先隐藏答案要求自由回忆；失败后依次给关键词、关系提示、关键步骤；每次只升级一级；回答后给一道同概念变式；要求用户解释理由；结束时产出可供四级评分的证据。 |
| `spaced-repetition/SKILL.md` | 按四级结果记录复习并由确定性策略安排下次日期。 | Again=无法独立回忆且需重学；Hard=在明显提示下完成；Good=独立完成但存在迟疑或小错；Easy=快速准确并能迁移；只能提交四值之一；不得自行计算日期；调用 `record_review_result` 后向用户复述工具返回的日期。 |
| `mastery-evaluation/SKILL.md` | 用可观察证据而非主观印象评估知识点掌握度。 | 证据依次检查准确性、独立性、解释质量和迁移能力；单次正确不能标记完全掌握；提示后正确最多评为 Hard；独立正确为 Good；独立完成变式且解释清楚才可为 Easy；记录错因标签和下一次复习建议。 |

`socratic-teaching/SKILL.md` 使用上方完整 Markdown 内容。六个文件都必须自包含，不得引用另一个 skill 中未在本文件重述的规则。

- [ ] **Step 4: 运行配置测试并提交**

Run: `uv run pytest tests/unit/agent/test_builtin_configs.py -v`
Expected: PASS。

```bash
git add src/agent/subagents/configs skills/learning tests/unit/agent/test_builtin_configs.py
git commit -m "智能体：配置学习子智能体和技能"
```

### Task 4: OpenSandbox、CompositeBackend 与主 Agent 工厂

**Files:**
- Create: `src/agent/backends/factory.py`
- Create: `src/agent/backends/__init__.py`
- Create: `src/agent/prompts/main.md`
- Create: `src/agent/factory.py`
- Create: `src/agent/runtime.py`
- Modify: `src/agent/graph.py`
- Test: `tests/unit/agent/test_agent_factory.py`
- Test: `tests/evals/cases.yaml`
- Test: `tests/evals/test_agent_quality.py`

**Interfaces:**
- Consumes: `RuntimeContext`、Mongo store/checkpointer、工具注册表、YAML 配置。
- Produces: `create_learning_agent(...) -> CompiledStateGraph`、`graph` factory 入口。

- [ ] **Step 1: 写入后端路由和子 Agent 解析失败测试**

```python
# tests/unit/agent/test_agent_factory.py
from unittest.mock import MagicMock
from agent.factory import compile_subagents
from agent.subagents.schema import SubAgentConfig
from agent.tools.registry import ToolRegistry


def test_compile_subagents_preserves_skills() -> None:
    tool = MagicMock(name="search_knowledge")
    tool.name = "search_knowledge"
    config = SubAgentConfig(
        name="socratic-tutor",
        description="x",
        tools=["search_knowledge"],
        skills=["/skills/learning/socratic-teaching/"],
        system_prompt="x",
    )
    result = compile_subagents([config], ToolRegistry([tool]))
    assert result[0]["skills"] == ["/skills/learning/socratic-teaching/"]
    assert result[0]["tools"] == [tool]
```

- [ ] **Step 2: 实现子 Agent 转换和主工厂**

```python
# src/agent/factory.py
from collections.abc import Sequence
from typing import Any
from deepagents import create_deep_agent
from agent.subagents.schema import SubAgentConfig
from agent.tools.registry import ToolRegistry


def compile_subagents(
    configs: Sequence[SubAgentConfig], registry: ToolRegistry
) -> list[dict[str, Any]]:
    return [
        {
            "name": config.name,
            "description": config.description,
            "system_prompt": config.system_prompt,
            "tools": registry.resolve(config.tools),
            "skills": config.skills,
        }
        for config in configs
    ]


def create_learning_agent(*, model: Any, tools: list[Any], subagents: list[dict[str, Any]], backend: Any, store: Any, checkpointer: Any, context_schema: type[Any]) -> Any:
    return create_deep_agent(
        model=model,
        system_prompt="你是 OmniMind 学习教练。先识别意图，再委派最合适的子智能体。",
        tools=tools,
        subagents=subagents,
        skills=["/skills/learning/"],
        memory=["/AGENTS.md"],
        backend=backend,
        store=store,
        checkpointer=checkpointer,
        context_schema=context_schema,
    )
```

```python
# src/agent/graph.py
from agent.factory import create_learning_agent


async def graph(config=None):  # LangGraph 平台向工厂注入 config
    from agent.runtime import build_runtime
    runtime = await build_runtime(config)
    return create_learning_agent(**runtime)
```

- [ ] **Step 3: 实现 CompositeBackend 路由契约**

```python
# src/agent/backends/factory.py
from deepagents.backends import CompositeBackend, StoreBackend


def build_backend(sandbox_backend, runtime):
    return CompositeBackend(
        default=sandbox_backend,
        routes={
            "/memories/": StoreBackend(runtime=runtime),
            "/persisted-skills/": StoreBackend(runtime=runtime),
        },
    )
```

`src/agent/runtime.py` 暴露 `async build_runtime(config: RunnableConfig | None) -> dict[str, Any]`，并按固定顺序执行：

1. `Settings()` 校验环境变量，分别创建 DeepSeek 主模型和摘要模型；主 Agent 只接收主模型。
2. `create_mongo_runtime(settings)` 创建 checkpointer 与 store；任一失败时关闭已创建资源并重新抛出。
3. `create_opensandbox_backend(settings)` 创建默认文件/执行后端；失败统一转换为 `RuntimeError("沙箱初始化失败")`，禁止宿主机后端兜底。
4. 从 learning MCP 和 knowledge MCP 取得工具，构造 `ToolRegistry`；加载三个 YAML 后立即 `registry.resolve`，未知工具使启动失败。
5. 创建 `RuntimeContext` 作为 `context_schema`，用 `build_backend` 组装 `CompositeBackend`，返回与 `create_learning_agent` 关键字参数完全相同的字典。

在 `test_agent_factory.py` 增加 `test_runtime_fails_closed_when_sandbox_is_unavailable` 和 `test_runtime_rejects_unknown_yaml_tool`；前者断言固定中文错误，后者断言错误包含未知工具名。

- [ ] **Step 4: 写入 Agent 行为评测**

`tests/evals/cases.yaml` 固定包含六类中文对话：概念错误先诊断、计算小错给最小提示、连续三次失败后完整讲解、用户明确要求直接答案、正确回答后要求变式迁移、检索回答保留来源。`test_agent_quality.py` 分两层：离线层用脚本化模型断言委派目标、工具名、提示升级顺序和不出现隐藏 reasoning 字段；`@pytest.mark.live` 层调用配置模型，每类至少 5 个样例，规则合格率必须为 100%，措辞/相关性评分平均不低于 0.8。失败报告保存 case ID、结构化事件和最终答案，不保存 API Key 或原始隐藏推理。

- [ ] **Step 5: 运行测试、LangGraph 导入检查和提交**

Run:

```powershell
uv run pytest tests/unit/agent -v
uv run pytest tests/evals/test_agent_quality.py -m "not live" -v
uv run python -c "from agent.graph import graph; print(graph)"
uv run ruff check .
uv run mypy src
```

Expected: tests PASS，输出 async graph factory，无 ruff/mypy 错误。

```bash
git add src/agent tests/unit/agent tests/evals
git commit -m "智能体：组装 Deep Agents 学习运行时"
```
