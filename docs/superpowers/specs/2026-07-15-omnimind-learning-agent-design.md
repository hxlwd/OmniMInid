# OmniMind 智能学习 Agent 系统设计

状态：已由用户批准  
日期：2026-07-15  
目标部署：单机服务器，8 核 CPU、32 GB 内存、100 GB 磁盘

## 1. 项目目标

OmniMind 面向高校课程、高考和考研学习场景，提供完整的个人学习闭环：

1. 理解用户提出的知识问题。
2. 通过严格的苏格拉底式提问定位卡点并引导用户思考。
3. 根据目标日期、可用时间和当前基础生成学习计划。
4. 记录学习事件、掌握度和计划执行情况。
5. 按确定性复习策略主动生成待复习任务。
6. 允许用户创建并灵活装载多个私有 RAGFlow 知识库。
7. 在测试 UI 中观察 Agent 委派、工具和检索流程，但不暴露模型隐藏思维链。

## 2. 已确认的产品边界

### 2.1 首版包含

- 用户在测试 UI 中输入 `user_id`，不建设正式注册登录系统。
- 不同 `user_id` 的会话、计划、学习记录、通知和知识库严格隔离。
- 用户可拥有多个私有知识库，并在会话中装载一个或多个；创建、上传、重命名、重试和删除入口只在测试 UI 管理员模式显示，普通模式只选择和检索。
- 知识库摄取支持 PDF、DOC、DOCX、Markdown 和 TXT。
- 所有支持的文档在进入 RAGFlow 前统一转换为 UTF-8 Markdown。
- 系统在 UI 中主动展示到期复习通知，不接邮件、微信等外部渠道。
- 单机 Docker Compose 部署全部自托管组件。

### 2.2 首版不包含

- 正式账号、密码、OAuth、组织、角色或多租户授权系统。
- 邮件、短信、微信或移动端推送。
- 多服务器高可用、自动横向扩容或跨区域容灾。
- 本地部署大语言模型、视觉模型或 MinerU 模型权重。
- RAGFlow 自带 Agent 编排替代 Deep Agents 主运行时。

### 2.3 重要安全说明

测试 `user_id` 只是命名空间键，不是真实身份。公网部署时必须在反向代理层增加测试访问口令或 IP 白名单。正式开放给不受信用户前，必须增加真实认证，并由认证结果在服务端产生 `user_id`，不能继续信任浏览器任意输入。

私有知识库的图片使用永久匿名公网 URL，不使用签名 URL。这满足 RAGFlow 稳定读取和 Markdown 展示要求，但链接一旦泄露，任何人都可以访问图片。对象键只能降低被猜中的概率，不能提供真正的访问控制。

## 3. 仓库重建原则

仓库历史中存在 React/TypeScript、Cloudflare Worker、Hono、TypeScript LangGraph 和 Supabase 原型。用户已明确要求清空原项目，不在正式实现中复用这些代码。

正式项目遵循以下原则：

1. 保留 Git 历史、中文 README 和本设计文档。
2. 删除原型源码、依赖锁文件、Worker 配置和 Supabase migration。
3. 从 `langchain-ai/new-langgraph-project` 模板重新建立 Python 后端，而不是在原型上渐进迁移。
4. 使用 Deep Agents 构建唯一的 Agent 运行时，不保留 TypeScript `StateGraph` Agent 循环。
5. 使用 MongoDBSaver 和 MongoDB 业务集合，不保留 Supabase 持久化。
6. 使用 React/TypeScript 重新实现 Studio 风格测试 UI，不继承原型的 API 和数据模型。
7. 每个实施阶段仍必须产生可运行、可测试、可回滚的独立提交。

## 4. 总体架构

系统采用“Deep Agents harness 主导 + 确定性学习服务”的混合架构。

### 4.1 应用服务

- `web`：React/TypeScript 测试 UI。
- `api`：FastAPI 网关，接收 `user_id`、管理会话和业务 API、输出 SSE。
- `agent`：由新 LangGraph 模板承载的 Deep Agents 运行时。
- `learning-mcp`：学习计划、任务、掌握度、复习和通知工具。
- `knowledge-mcp`：私有知识库装载、检索和来源查询工具。
- `ingestion-worker`：文档转换、图片摘要、MinIO 回写和 RAGFlow 入库。
- `review-scheduler`：扫描到期复习项并生成 UI 通知。

### 4.2 基础设施

- MongoDB：checkpoint、长期记忆、学习业务数据、摄取任务和调度状态。
- OpenSandbox：隔离 Agent 文件访问和代码执行。
- RAGFlow v0.26.4：dataset、文档解析、索引和检索。
- RAGFlow 依赖的 MySQL、Redis、Elasticsearch 和 MinIO。
- 反向代理：HTTPS、测试访问保护、路由、上传大小限制和静态资源缓存。

### 4.3 外部模型与解析服务

- 主模型：DeepSeek `deepseek-v4-pro`。
- 摘要及低成本任务模型：DeepSeek `deepseek-v4-flash`。
- 图片摘要：阿里云百炼 `qwen3.5-flash`，非思考模式。
- PDF 解析：MinerU Precision Extract API，推荐 `vlm` 模式。

模型名称、端点、超时和 Key 都由环境变量配置。仓库不得包含真实凭据。

## 5. Harness Engineering 设计

### 5.1 主 Agent

主 Agent 名称为 `learning-coach`，职责如下：

- 识别知识问答、计划制定、进度跟踪、复习和知识库检索意图。
- 根据任务边界委派子 Agent。
- 在每轮开始读取当前用户学习档案、活动计划和会话已装载知识库。
- 只通过结构化工具变更计划、任务、掌握度、复习时间和知识库装载状态。
- 保留知识库检索来源，不把模型自身知识伪装成检索内容。
- 对工具空结果和错误如实说明。

### 5.2 子 Agent

首版设置三个 YAML 子 Agent：

#### `socratic-tutor`

- 诊断前置知识和具体卡点。
- 一次提出一个问题。
- 按“轻提示、方向提示、关键步骤、完整讲解”逐级升级帮助。
- 用户明确要求直接答案，或多次尝试仍失败时，才给出完整讲解。
- 可使用知识库检索、联网搜索、沙箱和学习事件记录工具。

#### `study-planner`

- 收集目标、考试日期、当前基础、可用时间和限制条件。
- 输出结构化计划草案。
- 使用学习 MCP 创建计划和任务。
- 根据实际完成情况调整计划，但不得静默覆盖历史版本。

#### `review-coach`

- 读取到期复习项。
- 使用主动回忆、变式提问和错因诊断。
- 产生 `Again`、`Hard`、`Good` 或 `Easy` 评估。
- 使用学习 MCP 记录结果并安排下一次复习。

### 5.3 YAML 契约

每个子 Agent YAML 必须包含以下字段：

```yaml
name: socratic-tutor
description: 诊断知识卡点并通过分层问题引导用户理解。
tools:
  - search_knowledge
  - record_learning_event
skills:
  - /skills/learning/socratic-teaching/
  - /skills/learning/diagnostic-questioning/
system_prompt: |
  你是负责苏格拉底式教学的子 Agent。
```

加载器必须完成：

- YAML schema 校验。
- Agent 名称唯一性校验。
- 工具白名单解析，未知工具直接启动失败。
- skill 路径存在性和只读加载校验。
- 转换为 Deep Agents 官方 `SubAgent` 结构。
- 配置错误输出文件名、字段和可操作的修复信息。

### 5.4 Skills

首版 skills：

- `socratic-teaching`
- `diagnostic-questioning`
- `study-plan-design`
- `active-recall`
- `spaced-repetition`
- `mastery-evaluation`

业务策略优先通过主提示词、YAML、skills 和 MCP 工具演进。只有通用能力、权限边界、持久化、调度、事件协议和外部服务适配器写入框架代码。

## 6. 苏格拉底教学策略

默认流程：

1. 确认用户真正的问题或目标。
2. 用一个最小诊断问题定位理解层级。
3. 根据回答识别概念缺口、推理断点或方法选择错误。
4. 提供最少必要提示，再让用户继续作答。
5. 对错误推理明确指出冲突，但不直接替用户完成所有步骤。
6. 用户成功后要求其用自己的话总结或完成一个变式。
7. 记录本轮知识点、表现和需要复习的内容。

例外：

- 用户明确要求直接答案时，可以直接讲解，但仍应解释关键逻辑。
- 多轮尝试失败时，切换为完整讲解和示例。
- 涉及安全、高风险或事实时效性的问题，不强制用提问拖延必要信息。

## 7. 学习数据与复习闭环

### 7.1 MongoDB 业务集合

- `learning_profiles`：学习阶段、偏好、时区和当前目标。
- `study_plans`：目标、截止日期、状态和计划版本。
- `study_tasks`：每日任务、预计时长、顺序和完成状态。
- `learning_events`：学习、提问、测验、完成任务等不可变事件。
- `review_items`：知识点、掌握度、复习次数和下次复习时间。
- `notifications`：待处理、已读、完成或延期的 UI 通知。
- `knowledge_bases`：用户知识库与 RAGFlow dataset 映射。
- `knowledge_documents`：原件、转换结果、RAGFlow document 和状态。
- `ingestion_jobs`：摄取阶段、租约、重试和错误。
- `thread_mounts`：会话当前装载的知识库。

所有用户数据文档必须包含 `user_id`。查询必须同时使用业务 ID 和 `user_id`，不能查询后再在应用内过滤。

### 7.2 Checkpoint 与长期记忆

- 使用 `MongoDBSaver` 保存 LangGraph checkpoint。
- `thread_id` 标识会话，`user_id` 由运行时 context 注入。
- 长期记忆通过 CompositeBackend 路由到 MongoDB Store 命名空间。
- `/memories/{user_id}/` 保存偏好、目标和近期进展。
- `/skills/` 和 `/AGENTS.md` 为受控只读资源。
- 沙箱临时文件不进入长期记忆。

### 7.3 复习策略

Agent 只提交四级复习结果，不自行计算日期。`ReviewPolicy` 使用确定性规则计算下次复习时间：

- `Again`：重置或显著缩短间隔。
- `Hard`：小幅增加间隔。
- `Good`：按正常倍率增加间隔。
- `Easy`：按较高倍率增加间隔。

所有时间以 UTC 保存，按用户时区展示。首版默认时区为 `Asia/Shanghai`。

### 7.4 主动提醒

独立 `review-scheduler` 进程扫描到期 `review_items`：

1. 通过唯一键生成通知，防止重复。
2. UI 获取未读数量和任务列表。
3. 用户可开始复习、延期或完成。
4. 开始复习时创建或恢复带有复习上下文的会话。

## 8. 私有知识库与 RAGFlow

### 8.1 所有权模型

- 每个 `user_id` 可拥有多个知识库。
- MongoDB 保存 `user_id → knowledge_base_id → ragflow_dataset_id` 映射。
- RAGFlow API Key、dataset ID 和 document ID 不暴露给浏览器。
- 创建、上传、重试、删除、装载和检索都必须校验所有权。
- 当前用户可以在单个会话中装载一个或多个自己的知识库。

### 8.2 支持格式与统一输出

- `.pdf`：MinerU 精确解析为 Markdown、图片和结构化结果。
- `.docx`：提取标题、正文、表格和媒体文件，转换为 Markdown。
- `.doc`：LibreOffice 无头模式先转换为 DOCX，再进入 DOCX 流程。
- `.md`：规范化 UTF-8、标题、空行、链接和本地图片引用。
- `.txt`：检测编码，规范段落和标题，保存为 UTF-8 Markdown。

所有格式最终必须产生一个规范 Markdown 文件后才允许上传 RAGFlow。

### 8.3 摄取状态机

```text
RECEIVED
→ VALIDATING
→ SOURCE_STORED
→ CONVERTING_TO_MARKDOWN
→ EXTRACTING_IMAGES
→ SUMMARIZING_IMAGES
→ UPLOADING_PUBLIC_ASSETS
→ REWRITING_MARKDOWN
→ UPLOADING_TO_RAGFLOW
→ PARSING_IN_RAGFLOW
→ READY
```

任何阶段可转为 `FAILED`。任务保存失败阶段、错误类型、可重试标记和重试次数。

### 8.4 PDF 与 MinerU

PDF 流程：

1. 获取 MinerU 批量上传 URL。
2. 上传 PDF。
3. 按退避间隔轮询解析任务。
4. 下载并校验 ZIP。
5. 防止 Zip Slip 后解压。
6. 定位主 Markdown 和图片目录。
7. 保存解析元数据和原始页码映射。

文件超过 MinerU 限制时在上传前拒绝，并返回明确限制信息。

### 8.5 图片摘要与 MinIO

1. 从 Markdown 图片引用提取图片、上文和下文。
2. 调用 `qwen3.5-flash`，要求输出 50 字以内中文摘要。
3. 对图片内容做 SHA-256，避免重复上传。
4. 上传到公开只读 bucket。
5. 对象键包含用户哈希、知识库 ID、文档 ID 和内容哈希。
6. 将 `![原描述](本地路径)` 改写为 `![中文摘要](公网 URL)`。
7. 保存最终 Markdown 并上传 RAGFlow。

MinIO 匿名权限仅包含 `GetObject`，禁止 `ListBucket` 和任何写操作。原件与最终 Markdown 存在私有 bucket，不能匿名访问。

### 8.6 RAGFlow 适配器

RAGFlow 的版本差异封装在单一 adapter 中。adapter 负责：

- 创建、查询、更新和删除 dataset。
- 上传最终 Markdown。
- 触发解析并轮询文档状态。
- 执行带 dataset 限制的检索。
- 规范化 chunk、相似度、来源、章节、页码和图片 URL。
- 将外部错误转换为稳定的内部错误码。

### 8.7 知识库 MCP 工具

- `list_knowledge_bases`
- `mount_knowledge_bases`
- `unmount_knowledge_bases`
- `search_knowledge`
- `get_document_sources`

`search_knowledge` 不能接受模型任意传入的 RAGFlow dataset ID。服务端根据运行时 `user_id` 和 `thread_mounts` 解析允许检索的 dataset。

### 8.8 幂等与删除

- 同一用户内按原文件 SHA-256 去重。
- RAGFlow 文档创建使用稳定幂等键。
- 重试从最后一个成功阶段继续。
- 删除知识库时先标记为不可见，再异步删除 RAGFlow、私有对象和公开图片。
- 外部删除失败由补偿任务继续，不恢复用户可见状态。

## 9. Studio 风格测试 UI

### 9.1 信息架构

- 左侧：新建对话、历史会话、学习计划和知识库入口。
- 中间：聊天、知识库多选器、`user_id`、输入区和复习通知。
- 右侧：可折叠 Agent 流程检查器。

### 9.2 Agent 流程开关

默认关闭，只显示用户消息、最终回复和引用。

开启后显示：

- 主 Agent 与子 Agent 名称。
- 委派目标和任务状态。
- 工具名称、经过脱敏的参数摘要、结果摘要和耗时。
- 知识库检索来源。
- 摄取阶段、重试和错误。

禁止显示模型隐藏思维链、原始 reasoning token 或服务端密钥。

### 9.3 知识库页面

- 默认普通模式只显示当前 `user_id` 的知识库选择器和检索来源。
- 管理员模式允许创建、重命名和删除当前用户知识库，并批量上传支持格式。
- 管理员模式可查看每个文件的摄取阶段、进度和失败原因，并从失败阶段重试。
- 两种模式都可在聊天顶部多选装载当前用户的知识库。
- 管理员模式只是首版测试 UI 的功能开关，不替代正式服务端认证；整个测试站点仍由反向代理访问保护。

### 9.4 复习通知

- 展示未读数量、到期时间、知识点和所属计划。
- 支持开始复习、延期和完成。
- 点击开始复习进入 `review-coach` 上下文。

### 9.5 用户切换

`user_id` 变化时必须：

1. 中止当前流式请求。
2. 清空本地会话、计划、通知和知识库缓存。
3. 重新请求新用户数据。
4. 防止旧请求返回后写入新用户界面。

## 10. API 与事件协议

### 10.1 API 原则

- 所有业务接口接收服务端解析后的用户上下文。
- 所有写接口支持幂等键。
- 上传接口限制 MIME、扩展名、单文件大小和总配额。
- 错误返回稳定错误码、中文用户信息和可选调试 ID。

### 10.2 SSE 事件

标准事件类型：

- `thread.created`
- `message.delta`
- `agent.started`
- `agent.completed`
- `tool.started`
- `tool.completed`
- `tool.failed`
- `retrieval.completed`
- `ingestion.progress`
- `interrupt.required`
- `run.completed`
- `run.failed`

前端调试开关只影响渲染，不影响服务端真实执行和事件持久化。

## 11. 沙箱设计

- 采用参考项目的 OpenSandbox backend 思路，但重新实现配置与错误边界。
- 每个运行使用受控沙箱 ID，可按会话复用并设置过期时间。
- CompositeBackend 将 `/memories/` 路由到持久 Store，将普通临时路径路由到沙箱。
- `/AGENTS.md` 和内置 skills 启动时只读挂载。
- 代码执行限制 CPU、内存、磁盘、超时和网络能力。
- Agent 不能访问宿主 Docker socket、数据库端口或其他用户目录。
- 安全依赖工具和容器边界，不依赖提示词自律。

## 12. 部署设计

### 12.1 目标服务器

- 地址：`118.195.178.142`
- CPU：8 核
- 内存：32 GB
- 磁盘：100 GB

服务器地址属于部署配置，不写入业务模块。SSH 密码不进入仓库。

### 12.2 Docker 网络

- `edge`：反向代理与 Web/API。
- `app`：API、Agent、MCP、worker、scheduler。
- `data`：MongoDB、RAGFlow 依赖、MinIO。
- `sandbox`：OpenSandbox 控制面与执行容器。

数据库、RAGFlow 管理接口、MinIO 管理接口和 OpenSandbox 管理接口不映射到公网。

### 12.3 存储控制

- 使用 RAGFlow slim 镜像，不下载本地模型权重。
- 复用 RAGFlow Compose 中的 MinIO，不启动第二套 MinIO。
- 成功入库后删除 MinerU ZIP、解压目录和临时图片。
- 保留私有原件、最终 Markdown 和公开图片。
- Docker 与应用日志轮转。
- 磁盘 80% 告警，90% 暂停新导入。
- 备份保存到服务器外部。

## 13. 故障恢复

- 外部请求统一配置连接超时、读取超时、指数退避和最大重试次数。
- DeepSeek 不可用时返回明确错误，不返回伪造成功内容。
- 知识库检索不可用时说明 RAG 暂不可用，不用模型知识伪装检索结果。
- 有图片的文档在 Qwen 摘要失败时进入可重试失败状态，不静默丢图。
- worker 通过 MongoDB 原子租约领取任务；进程退出后租约到期可被重新领取。
- scheduler 使用唯一通知键，重复扫描不会重复创建通知。
- RAGFlow 或 MinIO 删除失败时由补偿任务继续清理。
- 所有用户可见错误带调试 ID，详细堆栈只进入脱敏日志。

## 14. 测试与验收

### 14.1 单元测试

- YAML schema、工具白名单和 skill 路径。
- `ReviewPolicy` 四级结果和边界时间。
- 用户所有权查询构造。
- 文件类型、大小、哈希和对象键。
- Markdown 图片识别、摘要和 URL 回写。
- RAGFlow 响应规范化。
- SSE 事件序列和脱敏。

### 14.2 集成测试

- MongoDBSaver checkpoint 恢复。
- OpenSandbox 文件隔离与超时。
- 学习 MCP 和知识库 MCP。
- MinerU、Qwen、MinIO、RAGFlow 使用测试替身的契约测试。
- worker 租约、失败恢复和重复提交。
- scheduler 重复扫描幂等。

### 14.3 端到端测试

- 用户 A 无法读取或装载用户 B 的会话、计划和知识库。
- PDF、DOC、DOCX、Markdown、TXT 全链路转换并可检索。
- PDF/Word 图片获得中文摘要、公网 URL 并回写 Markdown。
- 多知识库装载、取消装载和来源引用。
- 严格苏格拉底引导、直接答案例外和多次失败后的完整讲解。
- 计划创建、任务完成、到期通知、复习结算和下一次调度。
- Agent 流程开关不影响最终结果。
- 服务冷启动、worker 中途退出和容器重启恢复。

### 14.4 Agent 质量评测

建立覆盖高校课程、高考和考研的固定用例集，评估：

- 是否先诊断再提示。
- 是否一次只问一个核心问题。
- 是否避免过早泄露完整答案。
- 是否正确使用用户已装载知识库。
- 是否保留引用并避免编造来源。
- 是否在用户需要时切换为完整讲解。

## 15. 交付拆分

由于系统包含多个可独立验收的子系统，实施计划拆为以下阶段：

1. 仓库初始化与 Python Deep Agents 基座。
2. YAML 子 Agent、skills、MongoDB memory/checkpoint 与 OpenSandbox。
3. 学习计划、复习策略、通知与学习 MCP。
4. RAGFlow adapter、知识库 MCP 和私有所有权模型。
5. 文档摄取 worker、MinerU、Qwen 与 MinIO。
6. Studio 风格前端整合与 SSE 调试事件。
7. Docker Compose、安全加固、备份、监控和服务器部署。

每个阶段必须产生可运行、可测试的增量，使用中文提交信息。后续实施计划需给出准确文件路径、测试命令、预期结果和提交边界。

## 16. 文档与提交约定

- README、设计、计划、部署手册和提交信息默认使用中文。
- 代码标识符和第三方标准名称保留英文。
- `.env.example` 只能使用占位符。
- 任何日志示例必须脱敏 Key、Token、密码和连接串。
- 不在文档中记录用户曾提供的真实凭据。

## 17. 参考资料

- Deep Agents：https://github.com/langchain-ai/deepagents
- Deep Agents 前端：https://docs.langchain.com/oss/python/deepagents/frontend/overview
- LangGraph 新项目模板：https://github.com/langchain-ai/new-langgraph-project
- RAGFlow：https://github.com/infiniflow/ragflow
- MinerU：https://mineru.net/doc/docs/index_en/
- 阿里云百炼视觉模型：https://help.aliyun.com/zh/model-studio/vision-model
