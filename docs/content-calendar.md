# 内容日历编排 · 白驹全局大脑（B2）

> 工作线：B2 内容日历自动化（爆款炼金师监管 · B 线）
> 更新：2026-08-30（初版）
> 目标：把散落的 gen-daily / gen-viral 单点管线编排成一张「每日自动产出 → 落位 → 审查 → 部署」闭环日历。

---

## 一、每日时间矩阵（24h 编排）

| 时段 | 自动化任务 | 执行内容 | 产出落位 | 检查点 |
|---|---|---|---|---|
| 06:40 | 每日爆款选题引擎 | `gen-viral.mjs seed` 生成 5 个爆款选题入库 + `hooks` 验证 | `data/editorial-calendar.js`（E 系列选题，含爆点 why）→ **website/content-roadmap.html 自动展示** | 选题不重复、id 接续 |
| 07:00 | 每日 AI 新闻更新 | `gen-daily.mjs news` 头部插入 2 条、保留最新 12 条 | `data/news.js` → website/news.html | 新闻真实可溯源 |
| 08:00 | 每日博文更新 | `gen-daily.mjs blog` + `review-content.mjs sources` 二轮审查 + `opt-blog.py` 收录 | `blog/<标题>.html` → blog/index.html | 含 🤖 AI 生成标注与出处 |
| 08:30 | 博文爆款生产线（周二/四） | `gen-viral.mjs blog` 爆款主题博文 | `blog/` + 博客目录 | 标题钩子、结构、CTA |
| 09:00 | 每日书稿更新 | `gen-daily.mjs book` 轮转更新书稿章节 | `website/book/pages/` | 书稿章节完整性 |
| 10:00 | 每日作品更新 | 作品库新增 | `data/ai-showcase.js` 等 | 作品真实可核实 |
| 10:30 | **B 线 · 内容增长运营（本线）** | 内容质量审查 + 推进 B 任务 + SEO/传播审查 | `docs/site-progress.md`（append） | 见下方审查清单 |
| 11:00 | 每日作品类目更新 | 类目/展示位维护 | `data/ai-courses.js` 等 | 类目不空挂 |
| 11:30 | C 线 · 学习平台产品化 | 产品化推进 | — | — |
| 12:03 | 每日 AI 工具库更新 | `gen-daily.mjs tools` 深挖工具 | `data/ai-tools.json` | 工具 URL 有效 |
| 20:10 | 每日 AI 学院新章节 | `gen-academy.mjs` 章节扩展 | `website/ai-academy/` | 章节内容质量 |
| 23:50 | 每日 AI 学院链接巡检 | 链接巡检 | 巡检报告 | 死链清零 |
| 周六 10:30 | 视频爆款生产线 | `gen-viral.mjs vids` 短视频分镜 | `data/viral-scripts.js` | 可拍性 |
| 周日 21:00 | 每周内容周报 | 周产出汇总 | 周报 | 数据真实 |

> 注：所有产出最终经 `prepare-deploy.mjs` 同步到 `deploy/`（部署白名单已含 sitemap.xml / rss.xml / editorial-calendar.js 等）。

## 二、双管线职责划分

| 管线 | 脚本 | 职责 | 频次 |
|---|---|---|---|
| gen-daily（内容工厂） | `scripts/gen-daily.mjs` | 新闻/博文/书稿/项目/工具库日常供给，三级 LLM 降级（智谱免费→方舟→DeepSeek） | 每日 |
| gen-viral（爆款生产线） | `scripts/gen-viral.mjs` | 爆款选题入库 / 钩子 / 爆款博文 / 短视频分镜 | 每日 seed + 周频产出 |

**两线衔接**：06:40 选题引擎入库（gen-viral seed）→ 选题库落位 content-roadmap.html → 08:00/08:30 博文管线按热点兑现（gen-daily / gen-viral blog）→ 10:30 B 线审查排期合理性。

## 三、落位闭环（B2 新增）

1. **选题库 → 页面**：`website/content-roadmap.html` 消费 `window.EDITORIAL`，按 P1-P5 支柱分组展示 35+ 选题（含爆点理由），首页「内容与实验」区第四张卡入口。选题引擎每日新增自动可见。
2. **SEO 同步**：`gen-seo.mjs` 幂等重跑（补 description/keywords + sitemap.xml + rss.xml），新页自动纳入；已加**脏摘要检测**（旧模板「深度长文」占位/超长拼接垃圾 → 从正文首段重写，不编造）。
3. **部署同步**：`prepare-deploy.mjs` 将新页/新数据同步 `deploy/`。

## 四、B 线每日审查清单（内容增长视角）

- [ ] 近期博客标题是否有钩子（数字/反差/利益点），无占位名（如「深度长文」）
- [ ] meta description 是否真实正文首段、无「深度长文」等模板残留
- [ ] 选题热度：对照 editorial-calendar 排期与当日 AI 热点（E21-E35 爆款选题池）
- [ ] SEO 关键词：title/description 是否覆盖目标关键词
- [ ] 可传播性：是否有可截图的锚点（数据/对比表/金句），长文 CTA 是否注入
- [ ] 新发现 → TaskCreate 跟踪；改动前备份（_archive/）

## 五、下一步（B3-B5）

| 任务 | 目标 | 状态 |
|---|---|---|
| B3 书系资产化 | AI 实战全书/五卷全书导出 EPUB/PDF 可分发格式 | ⏳ 待办 |
| B4 访问统计与热榜 | 轻量统计 + 首页热榜模块 | ⏳ 待办 |
| B5 变现规划 | 会员/课程/广告位方案落地（方案文档 + 最小实现） | ⏳ 待办 |
