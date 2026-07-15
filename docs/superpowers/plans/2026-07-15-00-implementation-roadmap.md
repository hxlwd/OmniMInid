# OmniMind 总实施路线图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 规定七份实施计划的唯一执行顺序、跨阶段接口和最终验收口径，避免并行开发时出现工具未注册、协议漂移或部署配置先于实现的问题。

**Architecture:** 先建立 Python/LangGraph 基座和业务能力，再接入文档摄取，之后组装 Deep Agents harness，最后完成 UI 与服务器部署。MongoDB 是 checkpoint、业务数据和任务租约的真相源；RAGFlow dataset ID、模型密钥和对象存储凭据只存在于服务端。

**Tech Stack:** Python 3.12、Deep Agents、LangGraph、FastAPI、MongoDB、RAGFlow、MinerU、MinIO、React/TypeScript、Docker Compose。

## Execution Order

严格按以下顺序执行；每一阶段的全量验证通过并提交后才能进入下一阶段：

1. [平台基座](./2026-07-15-01-platform-foundation.md)：模板、依赖、配置、Mongo 生命周期和 API 健康检查。
2. [学习闭环](./2026-07-15-03-learning-loop.md)：计划、学习事件、复习策略、通知和 learning MCP。
3. [RAGFlow 私有知识库](./2026-07-15-04-ragflow-knowledge.md)：所有权、RAGFlow adapter、多库装载和 knowledge MCP。
4. [文档摄取](./2026-07-15-05-document-ingestion.md)：PDF/Word/Markdown/TXT 到 Markdown、图片处理、异步 worker。
5. [Agent Harness](./2026-07-15-02-agent-harness.md)：YAML 子 Agent、skills、工具注册表、OpenSandbox 和主 Agent。此时 learning/knowledge MCP 已可注册，不允许用临时工具替身进入生产运行时。
6. [Studio 测试界面](./2026-07-15-06-studio-ui.md)：聊天、流程检查器、用户切换、知识库和复习通知。
7. [部署与运维](./2026-07-15-07-deployment-operations.md)：镜像、Compose、安全入口、磁盘保护、备份和服务器验收。

## Cross-Phase Contracts

| 契约 | 生产者 | 消费者 | 不变量 |
|---|---|---|---|
| `RuntimeContext(user_id, thread_id, request_id)` | 平台基座 | Agent、MCP、API | `user_id` 由服务端运行时注入，模型不得自行指定 |
| `LearningService` 与六个 learning tools | 学习闭环 | Agent Harness、UI | 所有读写 filter 必须带 `user_id` |
| `KnowledgeMountService` 与五个 knowledge tools | RAGFlow 知识库 | Agent Harness、UI | MCP 不接受 RAGFlow dataset ID |
| `IngestionJob` 状态机 | 文档摄取 | UI、部署 worker | 阶段推进使用 Mongo 原子租约，可重启恢复 |
| `AgentEvent` 判别联合 | Agent/API | UI 检查器 | 只输出结构化执行事件，不输出隐藏思维链 |
| `/health/live`、`/health/ready` | API/Agent/worker | Compose/Caddy | ready 必须检查实际依赖，不以进程存活代替 |

## Requirement Coverage

| 设计要求 | 实施计划 |
|---|---|
| 官方 LangGraph 模板、Deep Agents、Mongo checkpoint | 01、02 |
| YAML 子 Agent 的 name/description/tools/skills/system_prompt | 02 |
| 苏格拉底引导、学习计划、主动回忆和掌握度 | 02、03 |
| 测试 UI 输入 `user_id`、管理员模式、流程开关和复习通知区域 | 03、06 |
| 用户私有、多知识库装载和 RAGFlow 工具 | 04 |
| PDF/DOC/DOCX/MD/TXT 全部转 Markdown | 05 |
| MinerU、Qwen3.5-Flash、MinIO 公网只读图片地址 | 05 |
| OpenSandbox、单机 8C/32G/100G 部署和恢复 | 02、07 |
| 中文 README、中文提交、仓库无真实凭据 | 全部阶段 |

## Final Verification

- [ ] `uv run pytest -m "not live" -v` 全部通过。
- [ ] `uv run ruff check .` 与 `uv run mypy src` 全部通过。
- [ ] `cd web && npm test && npm run build && npm run e2e` 全部通过。
- [ ] `docker compose -f deploy/compose.yaml -f deploy/compose.ragflow.yaml config --quiet` 返回 0。
- [ ] 用户 A 无法列出、装载、检索、修改或删除用户 B 的知识库、任务、通知和 checkpoint。
- [ ] UI 普通模式不渲染知识库创建、上传、重试、重命名或删除入口，只保留私有知识库选择与检索；管理员模式才显示管理入口。
- [ ] 含图片 PDF、DOCX、Markdown 和 TXT fixture 均生成 UTF-8 Markdown；图片 URL 可匿名 GET，但 bucket 不可列目录或写入。
- [ ] worker、scheduler、API 和 Agent 重启后，checkpoint、摄取任务与到期通知均能恢复且不重复。
- [ ] 仓库 secret scan 不包含 `sk-` Key、Bearer Token、数据库密码、SSH 密码或服务器 `.env`。
