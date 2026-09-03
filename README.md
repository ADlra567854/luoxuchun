# AI 创作纪元

基于用户桌面项目「AI创作纪元-离线手机版」升级的高质量版：书稿 · 智能体 · AI 对话 · 全生态知识库 · 工具导航，深色太空设计 + 粒子动画 + PWA 离线。

## 启动

```bash
node server.mjs        # → http://localhost:8787 （端口可用 PORT 环境变量覆盖）
```

> 生产部署请见 **[README-DEPLOY.md](./README-DEPLOY.md)**（Docker / PM2 / HTTPS 反代 / 安全清单）。

## 页面

| 入口 | 说明 |
|---|---|
| `/`（index.html） | 终极门户：粒子星空 + 动画 + 全站导航 + 编译模式（本地 IDE） |
| `/website/agent.html` | 全能智能体：模型切换、快捷提问、语音、文档、复制/导出、生图生视频 |
| `/website/chat.html` | AI 对话工作台：流式输出、生图/生视频工具条 |
| `/website/ecosystem.html` | 全生态知识库：22 大模块 / 132 子模块，数据驱动，离线可读 |
| `/website/workstation.html` | 白驹工作站：IDE（CodeMirror）× GitHub 免登录 × AI 对话 |
| `/website/portal.html` 等 28 页 | 原版知识收纳站（完整保留） |
| `/website/book/pages/*.html` | 《AI 实战全书》32 章书稿 |

## 架构（前端 ↔ 服务如何“互转”）

- **纯静态前端 + 轻量 Node 服务**（`server.mjs`，零第三方依赖）。
- AI 能力通过同源代理打通：`/api/chat`（SSE 流式对话）+ `/api/proxy`（生图/生视频/轮询，上游白名单）。
- **密钥只在服务端**（环境变量 `DEEPSEEK_API_KEY` / `ARK_API_KEY`），浏览器不持有任何真实密钥，访客免填 Key 即可对话；页面里自填 Key 会透传覆盖。
- `/healthz` 健康检查，供云平台探活。

## 模型

- DeepSeek（`deepseek-chat`）✅ 已验证
- 豆包·火山方舟（`doubao-seed-2-1-pro-260628`）✅ 已验证，含生图（`doubao-seedream-5-0-260128`）、生视频（`doubao-seedance-1-5-pro-251215`）
- 小米 MiMo（`mimo-v2.5`）— 需自行填 Key
- 密钥配置：本地复制 `.env.example` 为 `.env` 填入；云端在部署环境设环境变量

## IDE 功能（编译模式 COO / 白驹工作站）

- **HTML / JS**：浏览器沙箱本地真跑，输出与报错实时回传控制台（已验证 ✅）
- **Python**：Pyodide 浏览器本地运行，已切换 npmmirror 国内镜像（首次需联网下载运行时）
- **Markdown**：本地渲染预览
- **白驹工作站**：CodeMirror 编辑器 + GitHub 免登录浏览/下载 + AI 对话（内置 WebLLM 本地大模型 / Ollama / DeepSeek / 书稿检索 四种模式）

## PWA

`manifest.webmanifest` + `sw.js`（网络优先、离线回退）+ `icon.svg/192/512`。手机浏览器访问后自动可装桌面。

## 目录

- `data/` — 全生态知识库数据（47 个 JSON + embedded.js 内置兜底）
- `website/` — 全部功能页面
- `scripts/gen_icons.py` — 图标生成（PIL）
- `README-DEPLOY.md` — 云端部署指南（Docker / PM2 / Nginx / Caddy）
