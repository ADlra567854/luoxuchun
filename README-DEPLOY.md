# 🚀 AI 创作纪元 · 云端部署指南

> 一个静态内容站 + 轻量 Node 服务（`server.mjs`），生产运行**零第三方依赖**，可一键 Docker 化部署到任意云平台（腾讯云 / 阿里云 / 轻量服务器 / Vercel 类平台 / 容器服务）。

---

## 一、架构速览（前后端如何“互转”）

```
浏览器页面（155 个 HTML）
   │  同源请求（无需跨域）
   ▼
server.mjs（Node 原生 http，无依赖）
   ├─ 静态文件服务            → /、/website/*、/assets/* …
   ├─ /api/chat   (POST, SSE) → AI 流式对话代理（服务端 DEEPSEEK_API_KEY）
   ├─ /api/proxy  (POST/GET)  → 通用代理：聊天 / 生图 / 生视频 / 任务轮询
   │                            （上游域名白名单；方舟走 ARK_API_KEY）
   ├─ /healthz    (GET)       → 健康检查（云平台探活）
   └─ /api/health (GET)       → 同上别名
```

- **密钥只存在服务端**（环境变量 `DEEPSEEK_API_KEY` / `ARK_API_KEY`），浏览器不持有任何真实密钥。
- 所有 AI 页面（智能体 / 对话 / 工作站 / 悬浮助手 / 编译模式）通过同源 `/api/chat`、`/api/proxy` 调用，访客免填 Key，天然规避 CORS。
- 无数据库、无用户系统：纯内容站 + AI 代理，适合部署为“开箱即用”的知识门户。

---

## 二、环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `PORT` | 否 | 监听端口，默认 `8787` |
| `DEEPSEEK_API_KEY` | 推荐 | DeepSeek 对话密钥（白驹对话 / 智能体 / 悬浮助手） |
| `ARK_API_KEY` | 推荐 | 火山方舟密钥（生图 Seedream / 生视频 Seedance / 豆包对话） |

> 生产环境**不要**使用项目内 `.env`（已 `.gitignore`），直接在部署平台设置环境变量即可。

---

## 三、方式一：Docker 部署（推荐）

```bash
# 构建
docker build -t ai-jiyuan .

# 运行（把 sk-xxx / ark-xxx 换成你的真实密钥）
docker run -d --name ai-jiyuan -p 8787:8787 \
  -e DEEPSEEK_API_KEY=sk-xxx \
  -e ARK_API_KEY=ark-xxx \
  ai-jiyuan

# 验证
curl http://127.0.0.1:8787/healthz   # → {"status":"ok", ...}
```

镜像内自带 `HEALTHCHECK`，容器平台会自动探活重启。

---

## 四、方式二：裸机 Node 部署

```bash
# 需要 Node 18+（server.mjs 零第三方依赖，无需 npm install）
node server.mjs
```

生产进程管理（PM2）：

```bash
npm i -g pm2
DEEPSEEK_API_KEY=sk-xxx ARK_API_KEY=ark-xxx PORT=8787 pm2 start server.mjs --name ai-jiyuan
pm2 save && pm2 startup
```

---

## 五、HTTPS 反向代理（强烈建议）

站点含 PWA（Service Worker）与 WebLLM（浏览器本地大模型），**必须 HTTPS** 才能完整工作。

### Caddy（自动 HTTPS，最省事）

```caddy
ai.example.com {
    reverse_proxy 127.0.0.1:8787
    encode gzip
}
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name ai.example.com;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;   # SSE 流式输出必需
        proxy_read_timeout 300s;
    }
}
```

---

## 六、安全清单（部署前必读）

- ✅ **前端零密钥**：已移除 `website/settings.html` 中内置的真实 API Key，改为服务端环境变量注入。**请确认旧部署环境变量已正确设置**（否则对话/生图会报“未配置 API Key”）。
- ✅ **代理白名单**：`/api/proxy` 仅允许转发 DeepSeek / 火山方舟 / 小米 MiMo 等白名单域名。
- ⚠️ 访问控制：若仅供内部使用，建议在反代层加 Basic Auth / IP 白名单，避免公网任意访问消耗你的 API 额度。
- ⚠️ 不要将含真实密钥的 `.env` 提交到仓库（已在 `.gitignore`）。

---

## 七、国内网络注意事项

| 依赖 | 现状 | 说明 |
|---|---|---|
| Pyodide（浏览器内 Python，编译模式/工作站） | ✅ 已切 npmmirror 国内镜像 | 首次运行 Python 需联网下载约 10–40MB 运行时 |
| B 站视频封面图 | ✅ 已加 `referrerpolicy="no-referrer"` | 规避图床防盗链 403 |
| WebLLM（工作站内置大模型） | ⚠️ 需 WebGPU + 首次下载约 1GB | 国内访问 esm.run 可能较慢；可用 DeepSeek / Ollama 模式替代 |
| GitHub API（工作站仓库浏览） | ⚠️ 免登录限流 60 次/小时 | 提示性限制，可引导用户直接访问 GitHub 页面 |

---

## 八、验证清单

```bash
curl -I http://<你的域名>/                          # 200
curl http://<你的域名>/healthz                     # {"status":"ok",...}
curl -X POST http://<你的域名>/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"provider":"deepseek","messages":[{"role":"user","content":"你好"}]}'   # SSE 流式回复
```

浏览器打开：首页 → 编译模式（跑一段 JS）→ 白驹工作站（CodeMirror 正常加载）→ 智能体（发一条消息免 Key 对话）。
