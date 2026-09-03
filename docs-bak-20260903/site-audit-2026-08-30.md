# 网站现状排查报告（2026-08-30）

> 老罗要求重新排查网站"变成了什么、往哪发展"。结论：已从"AI 作品集"进化为「白驹全局大脑 · AI 创作纪元」——AI 内容工厂 + 知识门户 + 应用平台。

## 一、现状盘点

**定位**：ccowork · 白驹全局大脑 · AI 创作纪元（终极门户：粒子动画 + 全站导航 + 编译模式 IDE）
**规模**：HTML 470 个（有效约 155，deploy 副本占一半），内容持续日更（8-30 当天仍在更新）

### 内容资产
| 板块 | 内容 |
|---|---|
| 门户与应用 | index 终极门户、agent 全能智能体、chat 对话工作台、workstation（CodeMirror IDE + GitHub + AI）、gallery/voice/videos/reader |
| 知识资产 | 《AI 实战全书》32 章、书系 6 本（具身智能/对齐之路/工具大全/绘画/视频）、五卷全书+中国科技故事、AI 学院 19 章 + 12 栏目、生态库 22 模块/132 子模块 |
| 工科实验室 | lab/：仿真、算法、数值、ML、CNC、CICD、工科实训（Python 脚本 + 图文教程） |
| 内容工厂 | scripts/：gen-academy / gen-daily / gen-viral 批量生成管线；data/ 21 个结构化数据文件；automation.json 编排；博客 30 篇；小说 1 部 |

### 技术架构
- 纯静态 + Node 原生 http（server.mjs，零第三方依赖）
- /api/chat（DeepSeek SSE 流式）+ /api/proxy（生图/生视频/轮询，上游白名单）
- 密钥仅服务端（DEEPSEEK_API_KEY / ARK_API_KEY），访客免 Key
- Docker + PWA（manifest + sw.js 离线）+ 自动测试（test-*.mjs）
- 无数据库、无用户系统、无 git

## 二、问题清单
1. 🔴 **无 git 版本控制**——470 文件裸奔，改坏难回滚（最高危）
2. 🟠 **目录混乱**——deploy/ 副本混入源码（470=155+镜像）、_archive 残留
3. 🟠 **双导航体系**——index 8-28 内置新导航 + module.js 8-22 注入层（齿轮/悬浮窗）并存，单一真源缺失
4. 🟡 **线上部署矛盾**——CloudStudio 纯静态托管时 server.mjs AI 代理失效，线上无 AI 能力
5. 🟡 无站内搜索、无会话持久化、无统计埋点

## 三、发展方向（三线）
- **A 个人 AI 操作系统（推荐主线）**：git → 目录治理 → 全站搜索 → 导航单一真源 → 会话持久化 → 统计埋点 → 部署到有 Node 的云
- **B 内容平台增长（叠加线）**：SEO/sitemap/RSS → 内容日历 → 热榜 → 书系 EPUB/PDF 导出 → 变现
- **C 交互学习平台（产品线）**：学院测验+证书（证书页已有雏形）→ 学习路径 → lab 仿真接 Python 后端在线交互 → AI 助教
