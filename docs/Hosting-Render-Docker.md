# 🚀 arXiv Manager - Docker & Render 部署指南

**版本：** Hosting Pack v3.1
**更新日期：** 2025-10-14

本文档提供完整的 Docker 本地部署和 Render.com 云端部署指南。

---

## 📋 目录

- [环境变量清单](#环境变量清单)
- [Docker 本地部署](#docker-本地部署)
- [Render.com 云端部署](#rendercom-云端部署)
- [首次重建数据](#首次重建数据)
- [常见问题](#常见问题)
- [故障排除](#故障排除)

---

## 环境变量清单

### 必需变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `ARXIV_UA` | arXiv API User-Agent（**必填**） | `arXiv-Manager/1.0 (mailto:your@email.com)` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | Node 运行环境 | `production` |
| `GLM_API_BASE` | GLM API 基础 URL（用于 embeddings） | `https://open.bigmodel.cn/api/paas/v4` |
| `GLM_API_KEY` | GLM API 密钥 | - |
| `EMBEDDING_MODEL` | Embedding 模型名称 | `embedding-3` |
| `USE_SERVER_CLOCK` | 使用 arXiv 服务器时间 | `true` |
| `REBUILD_DAYS` | 重建天数 | `7` |

---

## 🐳 Docker 本地部署

### 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

### 步骤 1：准备环境变量

复制示例文件并填写配置：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，**至少设置 `ARXIV_UA`**：

```bash
# .env.local
ARXIV_UA=arXiv-Manager/1.0 (mailto:your-email@example.com)
```

### 步骤 2：启动服务

```bash
# 构建并启动容器
docker compose up -d

# 查看日志
docker compose logs -f
```

### 步骤 3：访问应用

打开浏览器访问：**http://localhost:3000**

### 步骤 4：首次重建数据

如果首次启动，数据库为空，需要手动触发重建：

**方式 1：通过 API（推荐）**

```bash
curl -X POST http://localhost:3000/api/admin/rebuild-7d
```

**方式 2：进入容器执行脚本**

```bash
docker compose exec arxiv-manager node scripts/rebuild-7d.mjs
```

**预期输出：**
```
[Rebuild] Starting 7-day rebuild...
[arXiv API] Using server time: 2025-10-14T...
[arXiv API] Fetched 1167 papers
[Rebuild] Wrote 1167 papers to data/papers.json
✅ Rebuild completed!
```

### 常用命令

```bash
# 停止服务
docker compose down

# 查看状态
docker compose ps

# 重启服务
docker compose restart

# 查看实时日志
docker compose logs -f arxiv-manager

# 清理并重启
docker compose down && docker compose up -d --build
```

### 数据持久化

数据存储在 `./data` 目录，映射到容器的 `/app/data`：

```
./data/
├── papers.json         # 论文数据
├── interactions.json   # 用户交互（喜欢/收藏）
├── collections.json    # 收藏夹
└── meta.json          # 元数据
```

**备份数据：**
```bash
tar -czf arxiv-data-backup-$(date +%Y%m%d).tar.gz data/
```

**恢复数据：**
```bash
tar -xzf arxiv-data-backup-20251014.tar.gz
```

---

## ☁️ Render.com 云端部署

### 前置要求

- Render.com 账号（免费或付费）
- GitHub/GitLab 仓库

### 方式 1：使用 Blueprint（推荐）

#### 步骤 1：推送代码到 GitHub

```bash
git add .
git commit -m "Add Hosting Pack v3.1"
git push origin main
```

#### 步骤 2：在 Render 创建服务

1. 登录 [Render Dashboard](https://dashboard.render.com/)
2. 点击 **"New +"** → **"Blueprint"**
3. 连接你的 GitHub 仓库
4. Render 会自动检测 `render.yaml` 并创建服务

#### 步骤 3：设置环境变量

在 Render Dashboard 中，进入 **Service Settings** → **Environment**：

**必须设置：**
- `ARXIV_UA` = `arXiv-Manager/1.0 (mailto:your-email@example.com)`

**可选设置：**
- `GLM_API_KEY` = `your-api-key`（如果需要 embeddings）

#### 步骤 4：等待部署完成

Render 会自动：
1. 运行 `npm ci && npm run build`
2. 挂载 1GB 持久化磁盘到 `/opt/render/project/src/data`
3. 启动服务 `npm run start:prod`

部署完成后，访问 Render 提供的 URL（如 `https://arxiv-manager.onrender.com`）。

### 方式 2：手动创建服务

#### 步骤 1：创建 Web Service

1. 点击 **"New +"** → **"Web Service"**
2. 连接 GitHub 仓库
3. 填写配置：
   - **Name:** `arxiv-manager`
   - **Region:** 选择最近的区域（如 Oregon）
   - **Branch:** `main`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run start:prod`

#### 步骤 2：添加持久化磁盘

1. 在 Service 页面，点击 **"Disks"**
2. 点击 **"Add Disk"**：
   - **Name:** `data`
   - **Mount Path:** `/opt/render/project/src/data`
   - **Size:** `1 GB`

#### 步骤 3：设置环境变量

同方式 1 的步骤 3。

#### 步骤 4：部署

点击 **"Create Web Service"**，Render 开始部署。

### 首次重建数据（Render）

部署完成后，数据库为空，需要触发重建：

**方式 1：通过 API（推荐）**

```bash
curl -X POST https://your-app.onrender.com/api/admin/rebuild-7d
```

**方式 2：通过 Render Shell**

1. 在 Render Dashboard，进入 **Service** → **Shell**
2. 运行命令：
   ```bash
   node scripts/rebuild-7d.mjs
   ```

**预期输出：**
```
[Rebuild] Starting 7-day rebuild...
[arXiv API] Fetched 1167 papers
✅ Rebuild completed!
```

刷新浏览器，应该能看到论文列表。

### 定时自动重建（可选）

#### 选项 1：使用 Render Cron Job

在 `render.yaml` 中取消注释 cron job 部分，重新部署。

Cron job 会每天凌晨 2 点（UTC）自动运行 `rebuild-7d.mjs`。

#### 选项 2：使用外部定时服务

使用 [EasyCron](https://www.easycron.com/) 或 [cron-job.org](https://cron-job.org/) 等免费服务：

- **URL:** `https://your-app.onrender.com/api/admin/rebuild-7d`
- **Method:** `POST`
- **Schedule:** `0 2 * * *`（每天凌晨 2 点）

---

## 🔄 首次重建数据

### 为什么需要重建？

首次部署后，`data/papers.json` 为空，需要从 arXiv 抓取论文。

### 重建方式对比

| 方式 | 适用场景 | 命令 |
|------|---------|------|
| **API 端点** | Docker/Render 均可 | `curl -X POST {BASE_URL}/api/admin/rebuild-7d` |
| **脚本执行** | Docker/Render Shell | `node scripts/rebuild-7d.mjs` |
| **手动上传** | 已有备份数据 | 上传 `papers.json` 到 `data/` |

### 推荐流程

1. **部署完成后，访问首页**（此时为空）
2. **触发重建 API：**
   ```bash
   curl -X POST https://your-app.onrender.com/api/admin/rebuild-7d?forceSource=auto
   ```
3. **等待 2-5 分钟**（取决于网络速度）
4. **刷新首页**，应该能看到论文列表

### 高级选项

**指定重建天数：**
```bash
# 重建最近 14 天的论文
REBUILD_DAYS=14 node scripts/rebuild-7d.mjs
```

**使用服务器时钟：**
```bash
# 使用 arXiv 服务器时间（推荐，避免时区问题）
USE_SERVER_CLOCK=true node scripts/rebuild-7d.mjs
```

---

## ❓ 常见问题

### Q1: Docker 构建失败，提示找不到 `npm`？

**A:** 确保使用 `node:20-alpine` 镜像，而不是 `alpine` 基础镜像。

### Q2: Render 部署成功，但访问显示 404？

**A:** 检查以下几点：
1. 确认 `npm run build` 成功完成
2. 确认 `start:prod` 脚本存在于 `package.json`
3. 检查 Render 日志中是否有错误

### Q3: 首次重建耗时很长？

**A:** 正常现象。重建 7 天数据需要：
- 抓取 ~1000-2000 篇论文
- 耗时 2-5 分钟
- 受网络速度影响

### Q4: 如何查看 Render 的持久化磁盘内容？

**A:** 通过 Render Shell：
```bash
ls -la /opt/render/project/src/data
cat /opt/render/project/src/data/meta.json
```

### Q5: Docker 容器重启后数据丢失？

**A:** 检查 `docker-compose.yml` 中 `volumes` 配置是否正确：
```yaml
volumes:
  - ./data:/app/data
```

确保宿主机 `./data` 目录有写权限。

### Q6: Render 免费套餐的限制？

**A:** Render 免费套餐：
- ✅ 750 小时/月（足够单个服务 24/7 运行）
- ✅ 1GB 持久化磁盘（免费，足够存储论文数据）
- ⚠️ 15 分钟无请求后自动休眠
- ⚠️ 每月 100GB 流量

### Q7: 如何避免 Render 休眠？

**A:** 使用 [UptimeRobot](https://uptimerobot.com/) 等免费监控服务，每 5 分钟 ping 一次：
```
https://your-app.onrender.com/api/health
```

---

## 🔧 故障排除

### Docker 相关

**问题：** 容器无法启动

```bash
# 查看详细日志
docker compose logs arxiv-manager

# 检查容器状态
docker compose ps

# 重建镜像
docker compose up -d --build
```

**问题：** 权限错误（Permission denied）

```bash
# 宿主机设置权限
sudo chown -R 1001:1001 ./data

# 或在 docker-compose.yml 中添加 user
services:
  arxiv-manager:
    user: "1001:1001"
```

### Render 相关

**问题：** 构建失败

1. 检查 Render 构建日志
2. 确认 `package.json` 中 `build` 脚本正确
3. 尝试本地运行 `npm run build`

**问题：** 持久化磁盘未挂载

```bash
# 在 Render Shell 中检查
ls -la /opt/render/project/src
echo $PWD
```

如果 `data` 目录不存在，重新配置磁盘挂载。

**问题：** 环境变量未生效

1. 确认在 Render Dashboard → Environment 中设置
2. 重新部署服务（手动触发）
3. 检查日志中是否打印了环境变量

---

## 📚 相关资源

- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Docker 官方文档](https://docs.docker.com/)
- [Render 文档](https://render.com/docs)
- [arXiv API 指南](https://info.arxiv.org/help/api/index.html)

---

## 🆘 获取帮助

如果遇到问题：

1. **检查日志：** Docker logs 或 Render logs
2. **查看文档：** 本文档或相关官方文档
3. **提交 Issue：** 在 GitHub 仓库提交问题

---

**Hosting Pack v3.1 - 让 arXiv Manager 轻松上云！**
