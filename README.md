# OmniMind 智能学习 Agent

OmniMind 是一个面向高校课程、高考、考研等学习场景的个人生成式智能 Agent。项目目标是帮助用户理解知识、制定学习计划、跟踪学习进度，并按照复习计划主动生成待复习任务。

## 当前状态

早期的 Cloudflare Worker、Supabase、TypeScript LangGraph 和 React 界面原型已经按项目要求清理。当前仓库保留中文说明和已批准的系统设计，正式项目将从 `langchain-ai/new-langgraph-project` 模板重新搭建，并采用以下技术架构：

- 使用 LangChain 家族的 Deep Agents 构建 Agent harness。
- 使用 YAML 声明子 Agent 的 `name`、`description`、`tools`、`skills` 和 `system_prompt`。
- 使用 MongoDB 保存 LangGraph checkpoint、学习档案、计划、复习任务和摄取任务。
- 使用 OpenSandbox 隔离文件与代码执行。
- 使用 RAGFlow 提供私有知识库检索。
- PDF 通过 MinerU 转换为 Markdown；Word、Markdown、TXT 也会统一规范为 Markdown。
- 文档图片由 Qwen3.5-Flash 生成中文摘要，上传 MinIO 后将公网只读地址回写 Markdown。
- 使用 React/TypeScript 构建类似 LangSmith Studio 的测试界面，支持开关 Agent 流程事件展示。

完整设计见 [OmniMind 学习 Agent 系统设计](docs/superpowers/specs/2026-07-15-omnimind-learning-agent-design.md)。

正式后端、前端和 Docker Compose 启动方式将在对应实施阶段补充。

## 安全要求

- 禁止把模型 API Key、SSH 密码、数据库密码和对象存储密钥提交到 Git。
- 仓库中的 `.env.example` 只能包含占位符。
- 部署密钥必须通过服务器环境变量或 Docker Secret 注入。
- 测试阶段的 `user_id` 仅用于命名空间隔离，不等价于正式身份认证。

## 协作约定

- README、项目文档和 Git 提交信息默认使用中文。
- 代码标识符、第三方 API 名称和命令保持其标准英文名称。
- 功能实现必须包含相应测试，并在提交前运行格式检查、类型检查和测试套件。
