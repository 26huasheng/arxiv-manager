# arXiv Manager

基于 Next.js 14 的 arXiv 论文管理系统，支持论文收集、向量检索、AI 分析和收藏管理。

## 功能特性

- **论文收集**：自动从 arXiv API 获取最新计算机科学论文
- **向量检索**：使用 GLM 嵌入模型进行语义搜索
- **AI 分析**：
  - 论文摘要生成（分节展示：研究背景、主要贡献、方法概述、实验结果等）
  - 论文评分（0-100分）
  - 多风格改写（学术风格、通俗风格、社交媒体风格）
- **收藏管理**：
  - 喜欢/收藏论文
  - 创建和管理收藏夹
  - 论文评分（1-5星）
- **定时更新**：每小时自动抓取新论文并生成向量嵌入

## 技术栈

- **前端**：Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **后端**：Next.js API Routes, Node.js
- **存储**：本地 JSON 文件（papers.json, embeddings.json, interactions.json, collections.json）
- **AI 服务**：智谱 GLM-4 (文本生成) + GLM Embedding-2 (向量嵌入)
- **其他**：node-cron (定时任务), xml2js (XML 解析)

## 环境变量

在项目根目录创建 `.env.local` 文件，配置以下环境变量：

```bash
# 智谱 AI API Key（必需）
# 获取地址：https://open.bigmodel.cn/
GLM_API_KEY=your_api_key_here

# GLM 模型配置（可选）
GLM_MODEL=glm-4-flash        # 文本生成模型，默认 glm-4-flash
GLM_EMBEDDING_MODEL=embedding-2  # 嵌入模型，默认 embedding-2

# arXiv API 配置（可选）
ARXIV_MAX_RESULTS=100         # 每次抓取的最大论文数，默认 100
ARXIV_SEARCH_QUERY=cat:cs.*   # 搜索查询，默认 cs.* (计算机科学全部分类)
```

### 环境变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `GLM_API_KEY` | ✅ | - | 智谱 AI API 密钥 |
| `GLM_MODEL` | ❌ | `glm-4-flash` | 文本生成模型（可选：`glm-4`, `glm-4-flash`） |
| `GLM_EMBEDDING_MODEL` | ❌ | `embedding-2` | 向量嵌入模型 |
| `ARXIV_MAX_RESULTS` | ❌ | `100` | 每次抓取论文数量（1-2000） |
| `ARXIV_SEARCH_QUERY` | ❌ | `cat:cs.*` | arXiv 搜索查询 |

## 安装和启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 GLM_API_KEY
```

### 3. 初始化数据（首次运行）

```bash
# 方式1：使用模拟数据快速开始
npm run seed

# 方式2：从 arXiv 抓取真实数据
npm run ingest    # 抓取论文
npm run embed     # 生成向量嵌入
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 生产环境部署

```bash
npm run build
npm start
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (http://localhost:3000) |
| `npm run build` | 构建生产版本 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 代码检查 |
| `npm run seed` | 生成模拟数据（快速测试） |
| `npm run ingest` | 从 arXiv 抓取最新论文 |
| `npm run embed` | 为论文生成向量嵌入 |
| `npm run cron` | 启动定时任务（每小时自动更新） |

## 定时任务

系统支持通过 `npm run cron` 启动定时任务，每小时自动执行：

1. 从 arXiv 抓取新论文
2. 为新论文生成向量嵌入

```bash
npm run cron
```

**定时任务特性：**
- 每小时整点执行（如 10:00, 11:00, 12:00...）
- 启动时立即执行一次
- 仅当有新论文时才生成嵌入（节省 API 调用）
- 支持优雅关闭（Ctrl+C）

**推荐部署方式：**

使用 PM2 在后台运行：

```bash
# 安装 PM2
npm install -g pm2

# 启动定时任务
pm2 start npm --name "arxiv-cron" -- run cron

# 查看日志
pm2 logs arxiv-cron

# 停止任务
pm2 stop arxiv-cron

# 开机自启
pm2 startup
pm2 save
```

## API 接口

### 论文相关

- `GET /api/papers` - 获取所有论文
- `GET /api/papers?id=<paper_id>` - 获取单个论文
- `POST /api/papers/scores` - 批量获取论文评分
- `GET /api/papers/[id]/interact` - 获取论文交互数据
- `POST /api/papers/[id]/interact` - 更新论文交互（点赞/收藏/评分）
- `GET /api/papers/interactions` - 获取所有交互数据

### 搜索相关

- `GET /api/search/vector?q=<query>&topK=20` - 向量语义搜索

### AI 分析

- `POST /api/llm/summarize` - 生成论文摘要
  ```json
  { "paperId": "arxiv-xxx" }
  ```

- `POST /api/llm/score` - 生成论文评分
  ```json
  { "paperId": "arxiv-xxx" }
  ```

- `POST /api/llm/rewrite` - 改写摘要
  ```json
  {
    "paperId": "arxiv-xxx",
    "tone": "popular" // 或 "academic" / "social"
  }
  ```

### 收藏管理

- `GET /api/collections` - 获取所有收藏夹
- `POST /api/collections` - 创建收藏夹
  ```json
  {
    "name": "Deep Learning Papers",
    "description": "收藏的深度学习论文"
  }
  ```

- `PUT /api/collections` - 更新收藏夹
- `DELETE /api/collections?id=<collection_id>` - 删除收藏夹
- `POST /api/collections/[id]/items` - 添加论文到收藏夹
  ```json
  { "paperId": "arxiv-xxx" }
  ```

- `DELETE /api/collections/[id]/items?paperId=<paper_id>` - 从收藏夹移除论文

### 管理接口

- `POST /api/admin/ingest` - 手动触发论文抓取

## 常见错误

### 1. GLM API 调用失败

**错误信息：**
```
Error calling GLM API: 401 Unauthorized
```

**解决方案：**
- 检查 `.env.local` 中的 `GLM_API_KEY` 是否正确
- 确认 API Key 有效且未过期
- 访问 https://open.bigmodel.cn/ 确认账户状态

### 2. 向量嵌入维度不匹配

**错误信息：**
```
Dimension mismatch: expected 1024, got 768
```

**解决方案：**
- 删除 `data/embeddings.json` 文件
- 重新运行 `npm run embed`

### 3. 论文抓取失败

**错误信息：**
```
Error fetching from arXiv: Network timeout
```

**解决方案：**
- 检查网络连接
- arXiv API 可能限流，等待 5-10 分钟后重试
- 减少 `ARXIV_MAX_RESULTS` 的值（如改为 50）

### 4. 数据文件损坏

**错误信息：**
```
SyntaxError: Unexpected token in JSON
```

**解决方案：**
- 检查 `data/` 目录下的 JSON 文件是否格式正确
- 如果文件损坏，删除后重新生成：
  ```bash
  rm data/*.json
  npm run seed  # 或 npm run ingest && npm run embed
  ```

### 5. 端口占用

**错误信息：**
```
Error: Port 3000 is already in use
```

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 npm run dev
```

### 6. TypeScript 编译错误

**解决方案：**
```bash
# 清理缓存
rm -rf .next
rm -rf node_modules
npm install

# 重新构建
npm run build
```

## 成本与速率限制

### GLM API 成本估算

基于智谱 AI 官方定价（2025年）：

**GLM-4-Flash（文本生成）：**
- 输入：¥0.1 / 百万 tokens
- 输出：¥0.1 / 百万 tokens

**Embedding-2（向量嵌入）：**
- ¥0.5 / 百万 tokens

**估算示例：**

假设每天处理 100 篇新论文：

1. **向量嵌入**：
   - 每篇论文约 500 tokens（标题+摘要）
   - 每天：100 篇 × 500 tokens = 50,000 tokens
   - 每月成本：50,000 × 30 ÷ 1,000,000 × ¥0.5 = **¥0.75**

2. **AI 摘要生成**（假设为 20% 的论文生成摘要）：
   - 每篇输入约 1,000 tokens（论文内容）
   - 每篇输出约 500 tokens（摘要）
   - 每天：20 篇 × (1,000 + 500) tokens = 30,000 tokens
   - 每月成本：30,000 × 30 ÷ 1,000,000 × ¥0.1 = **¥0.09**

3. **评分和改写**（假设为 10% 的论文）：
   - 每月成本：约 **¥0.05**

**每月总成本估算：约 ¥1-2 元**

### 速率限制

**智谱 AI：**
- 免费用户：10 次/分钟，100 次/小时
- 付费用户：60 次/分钟，1000 次/小时

**arXiv API：**
- 建议每 3 秒请求 1 次
- 每次最多 2000 条结果
- 不建议短时间内大量请求

**系统内置的速率限制保护：**

1. **嵌入生成**：
   - 批量大小：10 篇/批
   - 批次间隔：1 秒
   - 每小时最多处理：约 600 篇论文

2. **AI 分析**：
   - 使用缓存机制（7天有效期）
   - 避免重复调用

3. **定时任务**：
   - 每小时仅运行一次
   - 仅处理新增论文

### 优化建议

1. **减少 API 调用**：
   - 仅对重要论文生成 AI 摘要
   - 使用缓存避免重复分析
   - 调整定时任务频率（如改为 2 小时一次）

2. **批量处理**：
   - 嵌入生成使用批量接口
   - 合并多个请求

3. **监控成本**：
   - 定期检查 GLM 控制台用量
   - 设置用量告警

## 项目结构

```
.
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── admin/
│   │   │   └── ingest/       # 论文抓取接口
│   │   ├── collections/      # 收藏夹管理
│   │   ├── llm/              # AI 分析接口
│   │   ├── papers/           # 论文接口
│   │   └── search/           # 搜索接口
│   ├── collections/          # 收藏夹页面
│   ├── papers/[id]/          # 论文详情页
│   ├── page.tsx              # 首页
│   └── layout.tsx            # 布局组件
├── src/
│   ├── lib/                  # 核心库
│   │   ├── arxiv-ingest.ts   # arXiv 数据抓取
│   │   ├── embedding.ts      # 向量嵌入
│   │   ├── glm.ts            # GLM API 客户端
│   │   ├── store.ts          # JSON 数据存储
│   │   └── vector-search.ts  # 向量搜索
│   └── types/                # TypeScript 类型定义
│       └── paper.ts
├── scripts/                  # 脚本工具
│   ├── cron.ts               # 定时任务
│   ├── ingest-arxiv.ts       # 论文抓取脚本
│   ├── embed-titleabs.ts     # 嵌入生成脚本
│   └── seed-mock.ts          # 模拟数据脚本
├── data/                     # JSON 数据文件
│   ├── papers.json           # 论文数据
│   ├── embeddings.json       # 向量嵌入
│   ├── interactions.json     # 用户交互
│   ├── collections.json      # 收藏夹
│   ├── summaries.json        # AI 摘要
│   └── scores.json           # 论文评分
├── .env.local                # 环境变量（需自行创建）
├── package.json
└── README.md
```

## 开发指南

### 添加新的 AI 分析功能

1. 在 `src/lib/glm.ts` 中添加新的 API 调用方法
2. 在 `app/api/llm/` 下创建新的路由
3. 在论文详情页中添加 UI 调用

### 自定义论文来源

修改 `src/lib/arxiv-ingest.ts` 中的 `fetchArxivPapers` 函数，支持其他数据源。

### 扩展存储方式

当前使用 JSON 文件存储，可替换为：
- SQLite：轻量级数据库
- PostgreSQL：生产环境推荐
- MongoDB：文档型数据库

修改 `src/lib/store.ts` 中的实现即可。

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请提交 GitHub Issue。
