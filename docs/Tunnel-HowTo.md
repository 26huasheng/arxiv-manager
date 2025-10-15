# 🌐 Cloudflare Tunnel 使用指南

**版本：** Hosting Pack v3.1
**更新日期：** 2025-10-14

本文档提供 Cloudflare Tunnel 的完整使用指南，帮助你将本地 Next.js 应用安全地暴露到公网。

---

## 📋 目录

- [为什么不能用开发模式？](#为什么不能用开发模式)
- [正确的使用步骤](#正确的使用步骤)
- [检查硬编码问题](#检查硬编码问题)
- [快速关闭服务](#快速关闭服务)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

---

## ⚠️ 为什么不能用开发模式？

### 问题现象

如果你直接用 `npm run dev` + Cloudflare Tunnel，可能会遇到以下问题：

```
ERR  stream canceled
GET /api/papers - 499 (client closed request)
HMR connection failed
```

### 根本原因

**开发模式与 Cloudflare Tunnel 的兼容性问题：**

| 特性 | Next.js Dev 模式 | Cloudflare Tunnel | 冲突点 |
|------|-----------------|-------------------|--------|
| **HMR (Hot Module Replacement)** | WebSocket 长连接 | QUIC/HTTP3 协议 | ❌ WebSocket 握手失败 |
| **流式渲染** | Server-Sent Events (SSE) | 流量代理 | ❌ 流被提前关闭 |
| **文件监听** | 本地 fs.watch | 无关 | ⚠️ 增加开销 |
| **Source Maps** | 内联到响应中 | 大量小文件传输 | ⚠️ 性能差 |

**技术细节：**

1. **HMR WebSocket 问题**
   - Next.js Dev 使用 `ws://` 或 `wss://` 进行 HMR 通信
   - Cloudflare Tunnel 的 QUIC 协议对 WebSocket 升级支持不完善
   - 导致 `stream canceled` 错误

2. **流式渲染问题**
   - Next.js 14 使用 React Server Components 流式传输
   - Dev 模式会发送大量中间状态
   - Tunnel 的代理层可能提前关闭 HTTP 流

3. **性能问题**
   - Dev 模式没有优化（未压缩、未 minify）
   - 每次请求重新编译
   - 通过公网隧道访问，延迟极高

### 正确做法

**✅ 使用生产模式 + Tunnel**

生产模式特点：
- ✅ 无 HMR WebSocket
- ✅ 预编译，无实时编译
- ✅ 优化后的静态资源
- ✅ 稳定的 HTTP/HTTPS 请求

---

## 🚀 正确的使用步骤

### 前置要求

1. **安装 Cloudflared**

   **macOS:**
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

   **Windows:**
   ```powershell
   # 下载并安装
   # https://github.com/cloudflare/cloudflared/releases
   ```

   **Linux:**
   ```bash
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. **验证安装**
   ```bash
   cloudflared --version
   ```

### 步骤 1：构建生产版本

```bash
# 清理旧的构建
rm -rf .next

# 运行生产构建
npm run build
```

**预期输出：**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (14/14)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB          95 kB
├ ○ /api/health                          0 B             0 B
└ ○ /papers/[id]                         3.8 kB          93 kB
```

### 步骤 2：启动生产服务器

```bash
# 启动 Next.js 生产服务器（监听 0.0.0.0:3000）
npm run start:prod
```

**预期输出：**
```
▲ Next.js 14.2.18
- Local:        http://localhost:3000
- Network:      http://0.0.0.0:3000

✓ Ready in 1.2s
```

**重要：** 保持这个终端窗口运行，不要关闭。

### 步骤 3：启动 Cloudflare Tunnel

**打开新的终端窗口**，运行：

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

**预期输出：**
```
2025-10-14T15:30:00Z INF Thank you for trying Cloudflare Tunnel. Doing so, without a Cloudflare account, is a quick way to experiment and try it out. However, be aware that these account-less Tunnels have no uptime guarantee. If you intend to use Tunnels in production you should use a pre-created named tunnel by following: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps

2025-10-14T15:30:01Z INF Requesting new quick Tunnel on trycloudflare.com...
2025-10-14T15:30:02Z INF +--------------------------------------------------------------------------------------------+
2025-10-14T15:30:02Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2025-10-14T15:30:02Z INF |  https://random-words-1234.trycloudflare.com                                               |
2025-10-14T15:30:02Z INF +--------------------------------------------------------------------------------------------+
```

**重要：** 记下这个 URL（如 `https://random-words-1234.trycloudflare.com`）。

### 步骤 4：访问公网地址

**在任意设备（手机/平板/其他电脑）上：**

1. 打开浏览器
2. 访问 Tunnel 提供的 URL
3. 应该能看到完整的应用界面

**测试清单：**
- [ ] 首页论文列表加载正常
- [ ] 搜索功能正常
- [ ] 点击论文卡片进入详情页
- [ ] 收藏功能正常
- [ ] 无控制台错误

---

## 🔍 检查硬编码问题

### 为什么要检查硬编码？

硬编码的 `localhost` 或 `127.0.0.1` 会导致：
- ❌ 通过 Tunnel 访问时 API 请求失败
- ❌ 手机等外部设备无法访问

### 方式 1：使用 Grep（推荐）

```bash
# 在项目根目录运行
grep -r "localhost:3000\|http://localhost\|127.0.0.1" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  .
```

**预期输出：**
```
(无输出，表示没有硬编码)
```

**如果有输出：**
```
./app/some-page.tsx:15:  const res = await fetch('http://localhost:3000/api/papers')
```

**修复方法：**
```typescript
// ❌ 错误：硬编码
const res = await fetch('http://localhost:3000/api/papers')

// ✅ 正确：使用相对路径
const res = await fetch('/api/papers')

// ✅ 正确：使用 apiFetch（Build Compat Pack v3.0.4）
import { apiFetch } from '@/src/lib/httpClient'
const res = await apiFetch('/api/papers')
```

### 方式 2：使用浏览器 DevTools

**步骤：**

1. 通过 Tunnel URL 访问应用
2. 打开浏览器开发者工具（F12）
3. 切换到 **Network** 标签
4. 刷新页面
5. 查看所有 API 请求的 URL

**检查清单：**

| 请求 | ✅ 正确 | ❌ 错误 |
|------|---------|---------|
| 论文列表 | `GET /api/papers?days=7` | `GET http://localhost:3000/api/papers` |
| 交互数据 | `GET /api/papers/interactions` | `GET http://127.0.0.1:3000/api/...` |
| 收藏夹 | `GET /api/collections` | `GET http://localhost:3000/api/...` |

**如果看到 `localhost` 或 `127.0.0.1`：**
1. 记下文件位置（DevTools 会显示）
2. 修改为相对路径
3. 重新构建：`npm run build`
4. 重启服务：`npm run start:prod`

### 方式 3：使用 Next.js 内置检查

在 `next.config.mjs` 中添加严格模式：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 严格检查外部 URL
  async rewrites() {
    return []
  },
  async redirects() {
    return []
  },
  // 在生产构建时报错（如果有硬编码）
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
```

---

## ⚡ 快速关闭服务

### 方式 1：优雅关闭（推荐）

**步骤：**

1. **关闭 Cloudflare Tunnel**
   - 切换到运行 `cloudflared` 的终端
   - 按 `Ctrl + C`
   - 等待输出：
     ```
     INF Quitting...
     INF Tunnel server stopped
     ```

2. **关闭 Next.js 服务器**
   - 切换到运行 `npm run start:prod` 的终端
   - 按 `Ctrl + C`
   - 等待输出：
     ```
     ^C
     ```

**时间：** ~2 秒

### 方式 2：强制关闭

如果优雅关闭失败，使用强制关闭：

**macOS/Linux:**
```bash
# 查找进程
lsof -ti:3000

# 强制杀死
kill -9 $(lsof -ti:3000)

# 或一条命令
pkill -f "node.*next"
pkill -f cloudflared
```

**Windows (PowerShell):**
```powershell
# 查找进程
Get-Process -Name node,cloudflared

# 强制停止
Stop-Process -Name node -Force
Stop-Process -Name cloudflared -Force
```

### 方式 3：使用脚本

**创建 `scripts/stop-tunnel.sh`：**
```bash
#!/bin/bash
echo "Stopping Cloudflare Tunnel..."
pkill -f cloudflared

echo "Stopping Next.js server..."
pkill -f "node.*next"

echo "✅ All services stopped"
```

**使用：**
```bash
chmod +x scripts/stop-tunnel.sh
./scripts/stop-tunnel.sh
```

---

## ❓ 常见问题

### Q1: Tunnel URL 每次都不一样？

**A:** 这是正常的。免费的临时 Tunnel 每次启动都会生成新的随机 URL。

**解决方案：**
- **临时使用：** 接受随机 URL，每次手动分享
- **长期使用：** 注册 Cloudflare 账号，创建命名 Tunnel

**创建命名 Tunnel：**
```bash
# 登录 Cloudflare
cloudflared tunnel login

# 创建命名 tunnel
cloudflared tunnel create arxiv-manager

# 使用固定域名
cloudflared tunnel route dns arxiv-manager arxiv.yourdomain.com

# 启动
cloudflared tunnel run arxiv-manager
```

### Q2: Tunnel 连接不稳定，经常断开？

**A:** 可能的原因：
1. **本地网络问题** - 检查网络连接
2. **防火墙阻止** - 允许 cloudflared 访问外网
3. **临时 Tunnel 限制** - 升级到命名 Tunnel

**诊断命令：**
```bash
# 测试连接
cloudflared tunnel --url http://127.0.0.1:3000 --loglevel debug
```

### Q3: 手机访问显示 "连接超时"？

**A:** 检查清单：
1. **本地服务器是否运行** - `curl http://localhost:3000`
2. **Tunnel 是否活跃** - 查看 cloudflared 终端输出
3. **URL 是否正确** - 复制完整 URL（包括 `https://`）
4. **网络是否正常** - 尝试访问其他网站

### Q4: API 请求显示 CORS 错误？

**A:** Next.js API Routes 默认支持同源请求，不需要额外配置。如果出现 CORS 错误：

```typescript
// app/api/some-route/route.ts
export async function GET(request: Request) {
  // 添加 CORS 头（仅在必要时）
  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    },
  })
}
```

### Q5: 首页能访问，但 API 请求失败？

**A:** 这是硬编码问题。请参考 [检查硬编码问题](#检查硬编码问题) 部分。

### Q6: 构建很慢，每次都要等几分钟？

**A:** 优化建议：
1. **使用增量构建** - 不要每次都删 `.next`
2. **启用缓存** - Next.js 默认启用
3. **减少页面数** - 使用动态路由

```bash
# 第一次构建（慢）
npm run build

# 后续修改后构建（快）
npm run build  # 不删 .next
```

---

## 💡 最佳实践

### 1. 使用两个终端窗口

**终端 1：Next.js 服务器**
```bash
npm run build && npm run start:prod
```

**终端 2：Cloudflare Tunnel**
```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

### 2. 创建快捷脚本

**`package.json` 添加：**
```json
{
  "scripts": {
    "tunnel": "npm run build && npm run start:prod"
  }
}
```

**使用：**
```bash
# 终端 1
npm run tunnel

# 终端 2
cloudflared tunnel --url http://127.0.0.1:3000
```

### 3. 使用 tmux/screen（Linux/macOS）

**一个终端管理两个进程：**
```bash
# 创建 tmux 会话
tmux new -s arxiv-tunnel

# 启动 Next.js（窗口 0）
npm run start:prod

# 创建新窗口（Ctrl+B, C）
cloudflared tunnel --url http://127.0.0.1:3000

# 切换窗口：Ctrl+B, 0/1
# 退出会话：Ctrl+B, D
```

### 4. 使用环境变量区分环境

```typescript
// src/lib/config.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

// app/page.tsx
const res = await fetch(`${API_BASE}/api/papers`)
```

**开发：**
```bash
NEXT_PUBLIC_API_BASE=http://localhost:3000 npm run dev
```

**生产：**
```bash
NEXT_PUBLIC_API_BASE= npm run start:prod
```

### 5. 监控 Tunnel 状态

**创建 `scripts/tunnel-monitor.sh`：**
```bash
#!/bin/bash
while true; do
  if ! pgrep -f cloudflared > /dev/null; then
    echo "❌ Tunnel stopped at $(date)"
    # 可选：自动重启
    # cloudflared tunnel --url http://127.0.0.1:3000 &
  else
    echo "✅ Tunnel running at $(date)"
  fi
  sleep 60
done
```

### 6. 安全建议

**注意事项：**
- ⚠️ 临时 Tunnel 没有认证保护
- ⚠️ URL 是公开的，任何人都能访问
- ⚠️ 不要暴露敏感数据或管理端点

**保护措施：**
1. **添加基础认证**
2. **限制访问 IP**
3. **使用环境变量控制功能**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // 生产环境下保护管理端点
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
}
```

---

## 📚 相关资源

- [Cloudflare Tunnel 文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Next.js 生产部署](https://nextjs.org/docs/deployment)
- [Build Compat Pack v3.0.4 文档](./BUILD-COMPAT.md)

---

## 🎯 快速检查清单

部署前检查：
- [ ] 运行 `npm run build` 无错误
- [ ] 检查无硬编码 `localhost`（grep）
- [ ] 创建 `.env.local`（设置 `ARXIV_UA`）

启动前检查：
- [ ] 终端 1：`npm run start:prod` 正常运行
- [ ] 终端 2：`cloudflared` 显示 Tunnel URL
- [ ] 本地访问 `localhost:3000` 正常

访问后检查：
- [ ] Tunnel URL 能在手机上打开
- [ ] DevTools Network 面板无 `localhost` 请求
- [ ] API 请求正常（200 状态码）
- [ ] 无控制台错误

---

**Tunnel HowTo - 让你的 arXiv Manager 安全地走向世界！**
