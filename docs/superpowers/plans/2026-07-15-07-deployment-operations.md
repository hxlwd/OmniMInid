# OmniMind 部署与运维 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `118.195.178.142` 上以 Docker Compose 安全部署完整系统，并验证重启恢复、备份和磁盘保护。

**Architecture:** Caddy 作为唯一公网入口；应用、数据和沙箱分网；复用 RAGFlow v0.26.4 的 MySQL、Redis、Elasticsearch 和 MinIO。所有密钥通过服务器 Secret 文件注入。

**Tech Stack:** Docker 24+、Docker Compose 2.26+、Caddy、RAGFlow v0.26.4、MongoDB 8、OpenSandbox、Linux systemd、pytest/playwright。

## Global Constraints

- 目标服务器：8 核 CPU、32 GB 内存、100 GB 磁盘。
- 仅开放 80/443 和受限 SSH；数据库、RAGFlow 管理端、MinIO Console、MCP、OpenSandbox 不映射公网。
- 测试 UI 必须有访问口令或 IP 白名单，因为 `user_id` 不是真实认证。
- 磁盘 80% 告警，90% 暂停摄取。
- 备份保存到服务器外部。
- 真实密钥不得进入 Git、镜像层、容器日志或 README。
- 提交信息使用中文。

---

### Task 1: 应用镜像与健康检查

**Files:**
- Create: `docker/api.Dockerfile`
- Create: `docker/worker.Dockerfile`
- Create: `web/Dockerfile`
- Create: `.dockerignore`
- Test: `tests/deployment/test_images.py`

**Interfaces:**
- Produces: `omnimind-api`、`omnimind-worker`、`omnimind-web` 三个非 root 镜像。

- [ ] **Step 1: 写镜像契约测试**

```python
# tests/deployment/test_images.py
from pathlib import Path


def test_images_do_not_copy_dot_env() -> None:
    assert ".env" in Path(".dockerignore").read_text(encoding="utf-8")


def test_api_runs_as_non_root() -> None:
    content = Path("docker/api.Dockerfile").read_text(encoding="utf-8")
    assert "USER app" in content
    assert "HEALTHCHECK" in content
```

- [ ] **Step 2: 实现 API 镜像**

```dockerfile
# docker/api.Dockerfile
FROM python:3.12-slim AS runtime
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:0.8.8 /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY src ./src
ENV PATH=/app/.venv/bin:$PATH PYTHONPATH=/app/src
USER app
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live')"
CMD ["uvicorn", "omnimind.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

worker 镜像在同一基线上安装 LibreOffice、Pandoc 和字体，入口为 `python -m omnimind.ingestion`。web 使用 Node 构建阶段和 Caddy 静态运行阶段，最终不包含 npm cache。

- [ ] **Step 3: 构建并扫描镜像**

Run:

```bash
docker build -f docker/api.Dockerfile -t omnimind-api:test .
docker build -f docker/worker.Dockerfile -t omnimind-worker:test .
docker build -f web/Dockerfile -t omnimind-web:test web
docker run --rm omnimind-api:test python -c "import agent, omnimind"
```

Expected: 三个 build 成功，导入命令退出码 0。

- [ ] **Step 4: 提交镜像配置**

```bash
git add docker web/Dockerfile .dockerignore tests/deployment/test_images.py
git commit -m "部署：增加非特权应用镜像"
```

### Task 2: Compose、网络与 RAGFlow 依赖

**Files:**
- Create: `deploy/compose.yaml`
- Create: `deploy/compose.ragflow.yaml`
- Create: `deploy/Caddyfile`
- Create: `deploy/env.example`
- Test: `tests/deployment/test_compose.py`

**Interfaces:**
- Produces: `edge`、`app`、`data`、`sandbox` 网络和完整服务拓扑。

- [ ] **Step 1: 写 Compose 安全测试**

```python
# tests/deployment/test_compose.py
import yaml


def test_only_proxy_publishes_http_ports() -> None:
    compose = yaml.safe_load(open("deploy/compose.yaml", encoding="utf-8"))
    published = {name for name, service in compose["services"].items() if service.get("ports")}
    assert published == {"caddy"}


def test_data_services_are_not_on_edge_network() -> None:
    compose = yaml.safe_load(open("deploy/compose.yaml", encoding="utf-8"))
    for name in ["mongodb", "mysql", "redis", "elasticsearch", "minio"]:
        assert "edge" not in compose["services"][name]["networks"]
```

- [ ] **Step 2: 写入核心 Compose 服务**

`deploy/compose.yaml` 必须包含：`caddy`、`web`、`api`、`agent`、`learning-mcp`、`knowledge-mcp`、`ingestion-worker`、`review-scheduler`、`mongodb`、`opensandbox`。`deploy/compose.ragflow.yaml` 从 RAGFlow `v0.26.4` 官方 Compose 同版本提取 `ragflow`、`task-executor`、`mysql`、`redis`、`elasticsearch`、`minio`，不得混用 `main` 配置和版本镜像。

每个服务使用 `healthcheck` 和 `depends_on.condition: service_healthy`；Mongo、ES、MinIO 数据使用 named volume。

- [ ] **Step 3: 配置 Caddy 测试保护**

```caddyfile
# deploy/Caddyfile
{$OMNIMIND_DOMAIN} {
  encode zstd gzip
  basic_auth {
    tester {$OMNIMIND_TEST_PASSWORD_HASH}
  }
  handle /api/* {
    reverse_proxy api:8000
  }
  handle /threads/* {
    reverse_proxy agent:2024
  }
  handle {
    reverse_proxy web:80
  }
}
```

- [ ] **Step 4: 校验 Compose 并提交**

Run: `docker compose -f deploy/compose.yaml -f deploy/compose.ragflow.yaml config --quiet`
Expected: exit 0。

Run: `uv run pytest tests/deployment/test_compose.py -v`
Expected: PASS。

```bash
git add deploy tests/deployment/test_compose.py
git commit -m "部署：编排应用与 RAGFlow 服务"
```

### Task 3: 磁盘保护、清理与异机备份

**Files:**
- Create: `scripts/check_disk.sh`
- Create: `scripts/cleanup_ingestion.sh`
- Create: `scripts/backup.sh`
- Create: `deploy/systemd/omnimind-disk-check.service`
- Create: `deploy/systemd/omnimind-disk-check.timer`
- Test: `tests/deployment/test_operations_scripts.py`

**Interfaces:**
- Produces: 80% 告警、90% 摄取暂停标志、临时文件清理、Mongo/MinIO/RAGFlow 元数据备份。

- [ ] **Step 1: 写脚本行为测试**

```python
# tests/deployment/test_operations_scripts.py
from pathlib import Path


def test_disk_script_has_both_thresholds() -> None:
    script = Path("scripts/check_disk.sh").read_text(encoding="utf-8")
    assert "80" in script and "90" in script
    assert "INGESTION_PAUSED" in script


def test_backup_refuses_local_destination() -> None:
    script = Path("scripts/backup.sh").read_text(encoding="utf-8")
    assert "BACKUP_REMOTE" in script
    assert "mongodump" in script
```

- [ ] **Step 2: 实现磁盘保护脚本**

```bash
#!/usr/bin/env bash
set -euo pipefail
usage=$(df -P /var/lib/docker | awk 'NR==2 {gsub("%", "", $5); print $5}')
if (( usage >= 90 )); then
  touch /var/lib/omnimind/INGESTION_PAUSED
  logger -t omnimind "磁盘使用率 ${usage}%：已暂停摄取"
elif (( usage >= 80 )); then
  logger -t omnimind "磁盘使用率 ${usage}%：请扩容或清理"
else
  rm -f /var/lib/omnimind/INGESTION_PAUSED
fi
```

- [ ] **Step 3: 实现备份和恢复演练命令**

`backup.sh` 在 `BACKUP_REMOTE` 为空时立即退出 2；用 `mktemp -d` 建目录并以 trap 清理。依次生成 `mongo.archive.gz`（`mongodump --archive --gzip`）、`ragflow.sql.gz`（`mysqldump --single-transaction | gzip`）和两个 MinIO bucket mirror；写入每个文件的 SHA-256 清单后，通过 `rclone copy "$tmp" "$BACKUP_REMOTE/$(date -u +%Y%m%dT%H%M%SZ)"` 上传。任一步失败不得删除远端上一份备份。`docs/deployment.md` 固定记录每月在隔离 Compose project 中恢复 Mongo/MySQL/MinIO、启动 RAGFlow 和应用、运行 `test_user_isolation.py`，成功后销毁隔离 project。

- [ ] **Step 4: 运行测试并提交**

Run: `uv run pytest tests/deployment/test_operations_scripts.py -v`
Expected: PASS。

```bash
git add scripts deploy/systemd tests/deployment/test_operations_scripts.py
git commit -m "运维：增加磁盘保护和异机备份"
```

### Task 4: 服务器预检、部署与恢复验收

**Files:**
- Create: `scripts/preflight.sh`
- Create: `docs/deployment.md`
- Create: `tests/e2e/test_user_isolation.py`
- Create: `tests/e2e/test_restart_recovery.py`
- Modify: `README.md`

**Interfaces:**
- Produces: 可重复执行的部署手册和生产验收证据。

- [ ] **Step 1: 实现只读预检脚本**

`preflight.sh` 定义 `pass()`/`fail()` 并逐项检查：`nproc >= 8`、`MemTotal >= 32 GiB`、Docker 数据目录所在文件系统可用空间 `>= 100 GiB`、Docker server `>= 24`、Compose `>= 2.26`、`uname -m == x86_64`、`sysctl -n vm.max_map_count >= 262144`、80/443 没有监听者或仅由已标记的 OmniMind Caddy 占用。每项打印 `PASS/FAIL + 实测值 + 要求值`；任一失败累计并最终退出 1，脚本不得修改服务器状态。

- [ ] **Step 2: 执行服务器预检**

Run: `ssh <user>@118.195.178.142 'bash -s' < scripts/preflight.sh`
Expected: 所有项目显示 `PASS`。密码不写入命令或 shell history，优先配置临时 SSH public key。

- [ ] **Step 3: 部署并验证健康**

Run:

```bash
docker compose -f deploy/compose.yaml -f deploy/compose.ragflow.yaml pull
docker compose -f deploy/compose.yaml -f deploy/compose.ragflow.yaml up -d
docker compose -f deploy/compose.yaml -f deploy/compose.ragflow.yaml ps
curl -fsS https://$OMNIMIND_DOMAIN/api/health/ready
```

Expected: 所有容器 healthy；ready 返回 `{"status":"ok"}`。

- [ ] **Step 4: 运行端到端验收**

Run: `OMNIMIND_BASE_URL=https://$OMNIMIND_DOMAIN uv run pytest tests/e2e/test_user_isolation.py tests/e2e/test_restart_recovery.py -v`
Expected: 用户 A/B 越权全部 404；重启 worker、scheduler、api 后 checkpoint、摄取 job 和通知均恢复。

- [ ] **Step 5: 更新中文部署文档并提交**

README 增加本地开发、Compose 启动、环境变量、测试和安全警告；`docs/deployment.md` 记录首次部署、更新、回滚、备份和恢复命令，不包含真实 IP 以外的任何凭据。

```bash
git add scripts/preflight.sh docs/deployment.md tests/e2e README.md
git commit -m "部署：完成服务器部署和恢复验收"
```
