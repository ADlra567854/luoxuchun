# 工程进度 · A 线（白驹全局大脑 · 工程地基）

> 工作线：A1–A7 工程地基建设（架构通专家监管）
> 站点：`ccowork-site/AI创作纪元/AI创作纪元/`
> 进度文档：append-only，每次运行追加"日期 + 当日产出 + 架构审查 + 下一步"

---

## 2026-08-30（首次运行：A2 + A3）

### git 基线
- `ece812d`（基线快照，470 文件源码，排除 deploy/ 副本与密钥）→ `6de7d33`（纳入内容资产：题库 130 题 + 导航设置规范）
- 配置仓库身份：`luo-xuchun <luoxuchun@local>`

### A2 目录治理 ✅（纳入基线）
- `.gitignore` 已涵盖：deploy/、_archive/、密钥、构建产物、日志
- A2 视为已完成；后续如有源码冗余或临时副本累积，每日报告顺手清理

### A3 全站搜索 ✅（本次新增）

**产出文件：**

| 文件 | 大小 | 职责 |
|---|---|---|
| `scripts/gen-search-index.mjs` | 120 行 | 生成器：扫描有效 HTML → 抽取元数据 → 输出 `data/search-index.js` |
| `scripts/test-search.mjs` | 60 行 | 核心匹配逻辑 Node 单测（15 项断言） |
| `scripts/inject-search.mjs` | 30 行 | 幂等注入：给无 module.js 的页面追加 `<script src="/search.js">` |
| `scripts/ui-test-search.mjs` | 85 行 | Playwright 真实浏览器 UI 验证（13 项断言） |
| `data/search-index.js` | 234 KB | 索引数据：228 页 · `globalThis.SEARCH_INDEX` |
| `search.js` | 16.4 KB | UI 模块：导航按钮注入 + 搜索面板 + 匹配 + 高亮 + 键盘 |

**架构关键决策：**

1. **单一真源注入**：所有 module.js 覆盖页面通过 `module.js` 末尾一段 5 行加载器拉起 `search.js`；无 module.js 的 38 页（书系旧版/brand/study/assistant）由 `inject-search.mjs` 幂等注入。**覆盖率 229/229 = 100%**。

2. **零依赖**：核心匹配（`tokenize` / `match` / `firstHitIn`）作为纯函数挂在 `globalThis.CCOWorkSearch`，Node 可直接 `require()` 测试；DOM 部分 `if (typeof document === 'undefined') return` 早返。

3. **混合 CJK/拉丁分词**：tokenize 按空白 + 中英文标点拆；中文连续短语不拆（「提示词工程」作为单 token → 子串匹配）。

4. **加权打分**：标题 100 · 关键词 80 · 标题行 60 · 描述 40 · 正文 20；标题全等 +60，前缀 +25。

5. **降级 OR**：AND 无命中时降级为部分命中（任一 token 命中），保证召回。

6. **懒加载索引**：首次打开搜索才 `<script>` 加载 `search-index.js`，避免每页加载多 234 KB。

7. **XSS 防护**：高亮统一用 `esc()` + `markCI()`（大小写不敏感合并区间），结果列表以 `<a>` 文本节点 + `textContent` 赋值；无 innerHTML 注入用户输入。

8. **降级 UI**：导航折叠 / TOC 条遮挡（移动端导航换行被 `#modTocBar` 盖住下半部）→ 自动转悬浮按钮（z-index 9991 高于 TOC 条 99）。

9. **键盘可访问**：`/` 或 `Ctrl+K` 唤起；↑↓ 选中（scroll-into-view）；Enter 跳转；Esc 关闭；输入框外不触发。

10. **主题适配**：基础 + `body[data-theme="deep"]` 深空双主题（与 module.js 既有 token 体系保持一致）。

**测试结果：**

| 测试 | 覆盖 | 结果 |
|---|---|---|
| Node 单测 | 分词/中英混合/中文子串/书章节定位/PID 实验室/标题全等优先/空结果/降级 OR/性能 | ✅ 15/15 |
| Playwright UI | 按钮注入/中文检索/高亮/键盘导航/Enter 跳转/书页直注/ESC/Ctrl+K/深色主题/移动端/faq 检索/无 JS 错误 | ✅ 13/13 |
| 生成器自检 | 228 页 URL 全部有效 · 无重复 · 标题齐全 | ✅ |

**架构审查（架构师视角）：**

- ✅ 可扩展性：新增页面自动被纳入索引（生成器扫整个站点）；新增搜索字段（作者、标签等）只需扩展 `extract()` 与 `WEIGHT`。
- ✅ 单一职责：`gen-search-index.mjs`（生成）/ `search.js`（运行）/ `data/search-index.js`（数据）三层分离，互不耦合。
- ✅ 性能：228 页 × ~700B ≈ 160 KB 索引懒加载；匹配 20 次/全量 ≈ < 100 ms。
- ✅ 安全：密钥仍仅服务端持有（`server.mjs`），未引入客户端密钥；高亮防 XSS。
- ⚠️ **遗留风险 → 转 A4**：`module.js` 的 `#modTocBar` 在移动端与导航右侧按钮存在矩形冲突（placeBar 计算依赖 nav 初始 rect，多行换行后会"穿透"覆盖）。当前通过悬浮按钮降级规避；根治需 A4 重构导航定位体系。
- 🟡 **小改进（不阻塞）**：书页/博客的前 240 字符摘要含少量导航前缀文字，靠标题行与"命中字段"提示弥补；可在 C 线「内容工厂」阶段给书页加 `<meta name="description">` 提炼正文首段。

### ccowork.js 附带修复
- 既有 TypeError：`chatInput.addEventListener(...) is not a function` 在无聊天面板的页面（书系旧页、faq、study）抛出。
- 修复：line 451–452 绑定事件处加 `if (chatSend && chatInput)` 守卫。
- 影响：书系旧页全部消除页面 JS 错误（属每日架构审查顺手修）。

### 关键截图
- 浅色主题 `screenshot-search-light.png` · 深色主题 `screenshot-search-deep.png`（root 目录，gitignored）

### A 线总览（截至 2026-08-30）
| 任务 | 状态 |
|---|---|
| A1 git 版本控制 | ✅ 基线 `ece812d` + 今日 `6de7d33` |
| A2 目录治理 | ✅ deploy/_archive/ 已 gitignore |
| A3 全站搜索 | ✅ 完成（228 页索引 + UI 全站覆盖） |
| A4 导航单一真源 | ⏳ 待办（模块双导航 + TOC 条布局冲突） |
| A5 对话会话持久化 | ⏳ 待办 |
| A6 统计埋点 | ⏳ 待办 |
| A7 部署上线 | ⏳ 待办（准备评估 Zeabur / Railway / VPS） |

### 下一步建议
1. A4 优先（导航 / 设置悬浮窗单一真源，参考 `docs/design-system-nav-settings.md` 偏差 B1–B12）
2. 日常：每日运行 `git status` 与 `node scripts/gen-search-index.mjs`（若新增页面）
3. C 线内容：补书页/博客 `<meta description>`，提升搜索摘要质量

---

*本文档 append-only，每日运行追加新段落。*

---

## 2026-08-30 · A4 导航单一真源（完成）

### 改造范围（按规范 B1–B12 偏差清单执行）

| 偏差 | 级别 | 处置 |
|---|---|---|
| **B1** 主题双真源 | 🔴 | ✅ 桥接完成：`ccowork.theme` 为唯一真源；`baiju-config-v2.deep` 保留为旧键兼容层（首访初始化 + 双向同步） |
| **B2** module.js 注入样式硬编码色值 | 🔴 | ✅ 60+ 处裸 rgba/hex → 全部 `var(--xxx)` token（仅品牌渐变/光晕/白字保留） |
| **B3** #modGear/#modTop 深色底无云顶适配 | 🔴 | ✅ `var(--gear-bg)` 双主题；云顶 `rgba(255,255,255,.85)`、深空 `rgba(8,12,22,.9)` |
| **B4** #modNavGear style.cssText 内联 | 🟠 | ✅ 类名化：`class="nav-gear"`，样式走组件层 token + 双主题 hover |
| **B5** placeBar 兜底 56 vs 导航 64 | 🟠 | ✅ 兜底改 64；新增 `load` + 300ms 延迟重定位（导航加载后字体/换行变高无盲区） |
| **B6** #modSettings 无障碍缺失 | 🟠 | ✅ `role="dialog"` + `aria-labelledby="modSettingsTitle"` + Esc 关闭 + 焦点管理（打开入面板首个控件，关闭归还触发元素，点击外部不抢焦点） + `max-height:calc(100vh-120px)` + overflow-y |
| **B7** site-industrial 覆盖 .theme-btn 圆角 | 🟠 | ✅ 工业层改为仅作用于 `.cta`；`.theme-btn` 保留胶囊 |
| **B8** TOC z-index 99 过低 | 🟡 | ✅ 提升至 9990（规范层级带 `--z-bar`），根治 A3 遗留的移动端 TOC 遮挡导航 7px |
| **B9–B12** 文字/hover/选择器硬编码 | 🟡 | ✅ 全部 token 化或合规化（与 B2 合并处置） |

### 文件改动

| 文件 | 改动 |
|---|---|
| `theme-cloud.css` | 引擎层新增 7 个组件 token：`--nav-bg/--nav-line/--nav-shadow/--glass-strong/--gear-bg/--float-shadow/--nav-chip-bg`（双主题双体系各一套） |
| `module.js` | CSS 注入字符串 60+ 处 token 化 + 删深色硬编码覆盖块 + 新增 `.nav-gear` 组件层；JS：`injectNavGear` 类名化、`openSettings(trigger)` 焦点管理、`closeSettings(restoreFocus)` 区分主动/被动关闭、Esc keydown 监听、`placeBar` 兜底 64 + load + 延迟重定位；`applyAttr('data-theme')` 桥接写 `baiju-config-v2.deep` |
| `index.html` | 移除 :root 重复的 `--nav-bg/--nav-line/--nav-shadow`（迁移引擎层）；`loadSettings/saveSettings/toggleTheme` 桥接 `ccowork.theme` 键（ccowork.* 为真源，baiju 旧键作首访初始化与反向同步） |
| `site-industrial.css` | B7：`.cta,nav .cta,button.cta` 仅作用于 CTA；`.theme-btn` 圆角回归胶囊 |
| `scripts/ui-test-nav.mjs` | 新增（19 项 Playwright 真实浏览器验证） |

### 架构决策记录（ADR · 简短）

- **真源收敛**：`ccowork.theme/wall/font` 为外观唯一真源（ccowork.js 与 module.js 长期共用，已是事实标准）；`baiju-config-v2.deep/wall` 留作旧键兼容层，写入时同步、读取时以 `ccowork.*` 优先；旧键不存在时不主动创建（渐进废弃）。
- **Token 命名冲突规避**：引擎层建议 `--chip-bg`（规范 2.2）被 index.html Hero 徽章占用（`rgba(255,255,255,.16)` 白色系，专用语义），若下层会覆盖页面值导致渐变 Hero 徽章变色 → 改用 `--nav-chip-bg`（导航 hover 胶囊底），与页面占用解耦。规范文档 2.2 表的 `--chip-bg` 命名建议在下一次规范更新时按"页面级 vs 组件级"语义重新拆分。
- **CSS 字符串彻底瘦身**：原 60 行双主题硬编码（每次主题切换都要重复一份深色覆盖块），token 化后深色覆盖块全部删除，自动随 `body[data-theme]` 切换；估算 CSS 体积减少 ~25%。

### 测试结果

| 测试 | 通过 |
|---|---|
| `node --check module.js / ccowork.js / search.js` | ✅ 语法全绿 |
| `scripts/ui-test-nav.mjs`（A4 专用 19 项） | ✅ **19/19 全绿** |
| `scripts/test-search.mjs`（A3 Node 单测 15 项） | ✅ 15/15 全绿（无回归） |
| `scripts/ui-test-search.mjs`（A3 UI 13 项） | ✅ 13/13 全绿（无回归） |

测试覆盖：B1 桥接双向同步 + 刷新保持 + themeBtn↔悬浮窗互通 / B3 齿轮双主题 / B4 齿轮类名化与无 style.cssText / B6 面板 role/aria/Esc/焦点管理 / B8 TOC z-index 9990 / 移动端 TOC 不遮挡导航（A3 遗留根治）/ 全站无 JS 错误。

### 视觉验证

`screenshot-a4-{light,deep}-{nav,toc}.png`（root，gitignored）：浅色白毛玻璃 / 深色深紫蓝毛玻璃双主题下导航+设置窗+TOC 三层协调，无突兀黑块/白块。深色主题专属 on 激活态（青蓝渐变 + 深字）只在 deep 下生效（B2 修复了原版 cloud 下 on 也变青渐变覆盖蓝渐变的潜在 bug）。

### 部署同步

`scripts/prepare-deploy.mjs` 全量白名单同步通过：`module.js / theme-cloud.css / site-industrial.css / index.html` 等全部 diff 一致，密钥注入断言 100% 通过。

### A 线总览更新

| 任务 | 状态 | 提交 |
|---|---|---|
| A1 git 版本控制 | ✅ | `ece812d` |
| A2 目录治理 | ✅ | `ece812d` |
| A3 全站搜索 | ✅ | `c4867f5` |
| **A4 导航单一真源** | **✅ 本次完成** | **（待提交）** |
| A5 对话会话持久化 | 🟡 待认领 | — |
| A6 统计埋点 | 🟡 待认领 | — |
| A7 部署上线 | 🟡 待认领 | — |

### 下一步建议

A5（对话会话持久化）优先度提升：白驹 ccowork.js 已用 `ccowork.*` 真源体系，A5 可顺势复用（按 A4 同样模式：localStorage 键统一 → 单一真源），并消除 ccowork.js 第 30 行附近可能的会话存储双源风险。
---

## 2026-08-30 · B1 SEO 基础（完成）+ 内容爆款化第一刀（CTA 注入）

### B1 SEO 基础 ✅

**背景**：B 线首次运行。基线扫描 244 页：151 页缺 meta description（62%）、244 页全部缺 keywords、无 sitemap.xml / RSS。

**交付**：
- 新增 `scripts/gen-seo.mjs`（零依赖 · 幂等 · `--dry` 试跑）：
  - 全站补 `<meta name="description">`：从正文首段智能提取（article 优先，截断 110 字符，不含半截 emoji）——**不编造数据**
  - 全站补 `<meta name="keywords">`：title 主体词 + 页面类型词 + 品牌词
  - 生成 `sitemap.xml`：233 条 URL，含 lastmod（文件 mtime）/ changefreq / priority 分级（首页 1.0 → 博客 0.8 → 学院 0.8 → 书籍 0.7 → 其他 0.6）
  - 生成 `rss.xml`：blog 目录 29 篇博文，mtime 倒序，RFC822 pubDate
  - og:description 一并补齐（社交分享摘要）
- 结果：**156 页补 description + 76 页已有合格 = 全站 232/233 达标**（唯一例外为无正文可提取的页）；keywords 233/233 全覆盖
- `scripts/prepare-deploy.mjs` 白名单新增 `sitemap.xml` / `rss.xml`，部署镜像已同步且 diff 一致
- 基址：`https://cd4b0031dbe041d1b32f15cbab005a04.app.workbuddy.link`（正式域名上线后改 gen-seo.mjs 常量重跑一次即可）

### 内容爆款化第一刀：文章读完互动 CTA（每日内容优化）

**发现**：抽查 30 篇博文，**互动 CTA 全站为 0**——文章读完无任何转化引导（无订阅/分享/收藏引导），这是长文站的明显增长缺口。

**小步改进**（注入层，不改单个页面）：
- `module.js` 新增「文章读完互动 CTA」：正文 >800 字符的长文页自动注入底部卡片
  - 品牌句 +「读完了？别让这篇内容只躺在你的标签页里」
  - 分享按钮（navigator.share 优先，降级复制链接）+ 复制链接按钮
  - 相关阅读：博客目录 / AI 学院 30 章 / 回到首页（根相对路径，全层级通用）
  - 样式走主题 token（--card/--nav-line/--glass-strong），双主题自适应
- 幂等（id 守卫）；首页等非长文页不注入

### 测试结果

| 测试 | 通过 |
|---|---|
| `node --check`（module.js / gen-seo.mjs / prepare-deploy.mjs） | ✅ 语法全绿 |
| Python XML 解析（sitemap.xml / rss.xml） | ✅ 合法 XML，233 条 / 29 项 |
| 静态服务器 HTTP 探测（index / sitemap / rss） | ✅ 200 / 200 / 200 |
| Playwright UI 验证 8 项 | ✅ 8/8（博客 CTA 注入 + meta 存在 + 学院 CTA + 首页不注入 + 无 JS 错误） |
| 部署镜像 diff（module.js / sitemap / rss） | ✅ 全部一致 |

### 内容增长视角审查（爆款炼金师）

| 维度 | 现状 | 判断 |
|---|---|---|
| 选题热度 | 博文多为「AI 创业/工具实测/学习路径」长尾词，命中高意图搜索 | ✅ 合格（如"每天加班3小时到准点走"职场效率选题自带情绪钩子） |
| SEO 关键词 | 全站 keywords 从缺 → 全覆盖；title 含关键词 | ✅ B1 达标 |
| 可传播性 | 标题含数字/冲突/反差（30 篇中大量「3 个/4 个/别…」式钩子） | ✅ 良好；CTA 补齐后转化链路闭环 |
| 待提升 | 博客标题后缀不统一（"AI 创作纪元（离线版）" vs "白驹全局大脑"） | ⚠️ 建议下轮统一品牌后缀 |

### B 线总览

| 任务 | 状态 | 备注 |
|---|---|---|
| **B1 SEO 基础** | ✅ **本次完成** | meta 全覆盖 + sitemap.xml + rss.xml + gen-seo.mjs 可重跑 |
| B2 内容日历自动化 | 🟡 待办 | gen-daily/gen-viral 管线已在，待编排挂载（复用 automation.json） |
| B3 书系资产化 | 🟡 待办 | 6 本书无 EPUB/PDF 导出 |
| B4 访问统计与热榜 | 🟡 待办 | 无埋点无热榜 |
| B5 变现规划 | 🟡 待办 | 未启动 |

### 下一步建议

1. B2 内容日历：把 gen-viral seed 接入 editorial-calendar 数据（data/ 下确认），与 gen-daily 编排双管线
2. B3 书系：先做《AI 实战全书》单本 EPUB 导出打样（不编造、复用现有章节 HTML）
3. 博客标题品牌后缀统一（小步：改 title 模板或批量替换）

---

## 2026-08-30 · B2 内容日历自动化（完成）

### B2 内容日历编排 ✅

**核心发现（内容增长视角）**：17 个内容自动化（06:40 选题引擎 → 23:50 链接巡检）已在跑，但存在两处「产出未落位」缺口：
1. **选题库无人消费**：`data/editorial-calendar.js` 已有 35 个选题（E01-E35，含 E21-E35 爆款选题带爆点理由），但**全站无任何页面引用** `window.EDITORIAL` —— 每日 06:40 引擎入库的选题等于死数据。
2. **搜索摘要质量差**：29 篇博客的 meta description 是旧模板拼接垃圾（含「深度长文」占位词 + emoji + 导航文本重复），gen-seo 因「已有且 ≥30 字符」规则全部跳过，未被修复。

**交付**：

| 产出 | 说明 |
|---|---|
| `website/content-roadmap.html`（新页） | 选题库落位页：消费 `window.EDITORIAL`，按 P1-P5 支柱分组渲染 35 张选题卡（含 format/persona/状态/爆点 why），顶部统计 + 更新徽章（每日 06:40 入库自动可见） |
| 首页入口卡 | 「内容与实验」区第四张卡「🗺️ 内容路线图」，链接 content-roadmap.html |
| `docs/content-calendar.md`（新文档） | 每日时间矩阵（17 自动化时段/产出/落位/检查点）+ gen-daily/gen-viral 双管线职责 + B 线审查清单（运营 SOP） |
| `gen-seo.mjs` 增强 | 新增**脏摘要检测**：description 含「深度长文」占位 / 超长拼接（>220）→ 从正文首段重写；bodyText 剥离「⏱ 时长 / 📅 日期 / 🔥 生产线」开篇元信息；stripTitle 去掉标题重复；og:description 脏则同步替换。幂等可重跑 |
| 博客 SEO 修复 | 29 篇博客脏摘要 → 正文真实首段（如横评篇「2026年8月26日，距GPT-4o发布已满15个月…」）；`blog/深度长文.html` 占位 title「深度长文」→ 真实标题（与 H1 一致） |

**验证**：Playwright 5/5（35 张卡渲染 + 5 支柱分组 + 15 张含爆点理由 + 首页入口 + 零 JS 错误）；全站脏摘要清零（Python 全量扫描）；deploy 同步 diff 一致（content-roadmap.html / sitemap.xml / rss.xml / editorial-calendar.js 全部入 deploy）。

**提交**：`05a14b1`（并发会话含新页+首页入口）→ 本次 `feat(B2): 内容日历编排 + 选题库落位 + 脏摘要清洗`（14 files, +195/-89）。备份：`_archive/b2-backup-20260830/`。

### B 线总览更新

| 任务 | 状态 | 备注 |
|---|---|---|
| B1 SEO 基础 | ✅ | meta 全覆盖 + sitemap.xml + rss.xml + 长文 CTA |
| **B2 内容日历自动化** | **✅ 本次完成** | 17 自动化时间矩阵成文档 + 选题库落位页 + 脏摘要清洗 |
| B3 书系资产化 | 🟡 待办 | 6 本书无 EPUB/PDF 导出 |
| B4 访问统计与热榜 | 🟡 待办 | 无埋点无热榜 |
| B5 变现规划 | 🟡 待办 | 未启动 |

### 内容增长视角审查（爆款炼金师）

| 维度 | 判断 |
|---|---|
| 选题热度 | E21-E35 爆款选题池（考公 AI / 老年广场舞机器人 / 流浪猫投喂 / 简历工具横评…）覆盖亿级流量赛道，传播锚点明确 ✅ |
| SEO 关键词 | 29 篇博客搜索摘要从「深度长文」垃圾 → 真实正文首段，CTR 提升点明确 ✅ |
| 可传播性 | 选题卡公开呈现 + 爆点理由展示，形成「催更文化」入口；博文标题钩子已普遍带数字/反差 ✅ |
| 遗留 | 博客目录页 title「博客目录 · 白驹全局大脑」品牌后缀与其他页（AI 创作纪元（离线版））不统一 → 下次小步统一 |

### 下一步建议

1. B3 书系：先做《AI 实战全书》单本 EPUB 导出打样（复用现有章节 HTML，不编造）
2. 博客目录页 title 品牌后缀统一（小步）
3. 每日：gen-seo 若新增页面后重跑；观察 content-roadmap 访问数据（B4 埋点后）

---

## 2026-08-30 · B3 书系资产化 + B4 统计热榜 + B5 变现规划（完成，B 线闭环）

### B3 书系资产化 ✅（《AI 实战全书》打样）

**交付**：EPUB 3.0（32 章 · 56,616 字 · 96 KB）+ PDF（87 页 · 3.9 MB），书页加下载入口（⬇️ EPUB / ⬇️ PDF，真下载可分发）。

| 产出 | 说明 |
|---|---|
| `scripts/gen-book-epub.py` | 零依赖 EPUB 生成器（Python 标准库 zipfile）：章节按「导读 → 第 1-16 章（章号排序）→ 补充篇」排列；复用 `<article>` 正文、h1 为章题；剥导航/样式/死链；mimetype 首位 STORED + container/opf/ncx/nav 完整 |
| `scripts/gen-book-pdf.mjs` | Playwright Chromium print-to-PDF：合集 HTML → A4 PDF（零额外依赖） |
| `website/book/AI实战全书.epub` / `.pdf` | 可分发产物，`prepare-deploy` 排除式白名单自动同步 |
| 书页下载区 | 下载按钮 + 会员预告条（B5 最小实现） |

**验证**：zip 完整 39 文件 / mimetype 首位 STORED / 4 个 XML 合法 / 章节零残留 script·style·iframe / 全库 5.6 万字；PDF 头合法 87 页；Playwright 书页下载入口 + 文件可达 200。

### B4 访问统计与热榜 ✅（最小实现）

| 产出 | 说明 |
|---|---|
| `stats.js` | 零后端本地埋点（localStorage：ccowork.views 按 URL 计数 + 标题库 + 当日统计）+ `CCOWorkStats.getHot()` API + 首页热榜渲染 |
| 首页「热榜 · 大家都在读」 | news 区块后新增 `#ccoworkHot` 模块（Top 5，排名徽章 + 标题 + 次数，双主题 token） |
| 全站注入 | module.js ⑥ 懒加载 stats.js（197 页自动覆盖）+ `inject-stats.mjs` 给 39 个无 module.js 页面注入（236/236 全覆盖） |
| `prepare-deploy.mjs` | 根文件白名单纳入 `stats.js` |

**验证**：Playwright 热榜 4 条渲染（第一名「提示词工程实战」）、stats API totalViews=10/totalPages=6、零 JS 错误。
**边界说明**：纯前端统计为单机数据（静态托管无后端），功能闭环演示；跨用户真实统计待 B5 支付/后端阶段升级。

### B5 变现规划 ✅（方案文档 + 最小实现）

- `docs/monetization-plan.md`：变现三支柱（① 会员订阅 ¥19/49/自定义三档 ② 课程买断 ¥99-199 ③ 克制型广告）+ 现状资产盘点 + **合规红线**（无「最/第一」、不诱导分享、不假按钮、未接支付前仅文案预告）+ 待老罗拍板项（支付通道/定价/优先序）
- 最小实现：书页下载区「会员计划预告」纯文案条（无收款、无假按钮）

### 遗留小项 ✅

- 博客目录页 title「博客目录 · 白驹全局大脑」→「博客目录 · AI 创作纪元（离线版）」+ description 从导航垃圾清洗为真实摘要（29 篇事实陈述，不编造）

### B 线总览（终态）

| 任务 | 状态 |
|---|---|
| B1 SEO 基础 | ✅ |
| B2 内容日历自动化 | ✅ |
| **B3 书系资产化** | ✅ 《AI 实战全书》EPUB/PDF 打样 |
| **B4 访问统计与热榜** | ✅ 轻量统计 + 首页热榜 |
| **B5 变现规划** | ✅ 方案文档 + 最小实现 |

### 验证与提交

- Playwright：书页下载 2 项 + 热榜 4 条 + stats API + 零 JS 错误 全绿；deploy 同步 diff 一致（stats.js/epub/pdf/书页/index/module.js）
- 提交：`feat(B3+B4+B5)`（13 files + 2 二进制）；并发会话 23b38e0 曾 git add -A 卷走 34 页 stats 注入（内容正确）；备份 `_archive/b2-backup-20260830/`

### 下一步建议

1. B3 推广：其余书系（五卷全书等）EPUB 导出 → 全量书库可分发
2. 老罗拍板：支付通道（微信支付/爱发电/其他）+ 会员定价 → B5 二期落地
3. 跨用户统计：A7 部署选型（Zeabur/VPS）后 B4 升级真实统计

---

## 2026-08-30（C1 学院测验 + 证书 ✅）

### C 线启动：学习平台产品化（产品通监管）

- 新增 `docs/learning-platform-prd.md`：北极星指标（学完 ≥1 章 + 完成 ≥1 测验的占比）+ 驱动/健康指标 + C1-C4 需求清单 + 产品审查发现（P1-P4）+ Now-Next-Later 路线图
- 备份：`_archive/c1-backup-20260830/`（cert/academy/题库三文件）

### C1 产出

| 文件 | 说明 |
|---|---|
| `website/ai-academy-quiz.html`（新） | 测验/认证考试页：练习模式（10 域，5 可用 + 5 扩充中占位）· 认证考试（CERT02 智能体/CERT03 RAG，10 题 ≥80% 发证）· 我的记录（获证 + 历史表） |
| `website/ai-academy-cert.html`（增强） | 新增「我的认证」动态区（已获证徽章/待考取入口）+ 打印证书弹层（姓名/编号 CCOWORK-xxx-YYYYMMDD/日期/分数，@media print 仅证书本体） |
| `website/ai-academy.html`（增强） | Hero chips 加「📝 章节测验·认证考试」+ 认证区「去测验 / 考取 CERT02 / CERT03」CTA |
| `scripts/verify-c1.mjs`（新） | Playwright 端到端验证（16 项断言） |

### 关键产品决策

1. 认证考试 ≥80% 通过线；多选全对才得分（从严保证含金量）
2. **诚实原则**：题库未覆盖域（prompt/multi/eng/eval/apply）显示「扩充中」，CERT01/04 考试暂缓，不放假考试
3. 所有记录 localStorage（scores/certs/history/learnerName），无后端、无隐私外泄
4. 证书「能力自证」定位，文案避免「官方认证」误导

### 验证与发现

- Playwright 16/16 全绿（答题判分 → 发证 → 证书页展示 → 打印弹层 → 首页入口 → 零 JS 错误）
- 发现 P1：`data/ai-quiz.js` 声称 130 题 10 域，实际 65 题 5 域 → 已诚实降级 + 列入新任务（扩充题库）
- 遗留：旧 quiz.html（英语/数学刷题）与学院割裂，后续评估迁移/下线

### C 线状态

| 任务 | 状态 |
|---|---|
| **C1 学院测验 + 证书** | ✅ 16/16 验证通过 |
| C2 学习路径追踪 | ⏳ 下一步（章节打卡 + 进度条 + 考试前置门槛） |
| C3 lab 仿真在线化 | ⏳ |
| C4 AI 助教 | ⏳ |

### 下一步建议

1. C2：章节页打卡（module.js 注入 30 章）→ 首页进度条 → 路线图按周打卡 → 认证考试加打卡前置
2. 扩充题库至 10 域 130 题（补 prompt/multi/eng/eval/apply），解锁 CERT01/04 考试
3. 旧 quiz.html 迁移评估（并入学院测验 or 下线）

---

## 2026-08-30 · A5 对话会话持久化（完成）

### 改造背景
悬浮工作台 ccowork.js 的聊天面板仅存 8 条消息于内存，刷新即丢；agent.html 智能体页已有完整多会话体系（`ccowork.sessions.v1`）。A5 目标：两边数据互通，悬浮聊天也有多会话 + 持久化。

### 交付

| 模块 | 说明 |
|---|---|
| **会话栏 UI** | 聊天面板顶部新增：当前会话标题 +「+ 新会话」按钮 +「🕘 历史」按钮 |
| **多会话管理** | `loadSessData / saveSessData / createSession / switchSession / deleteSession` 全套函数，数据格式与 agent.html 完全一致 |
| **持久化** | 每条消息（用户/AI/生图）实时写入 `localStorage.ccowork.sessions.v1`，刷新自动恢复最近会话 |
| **历史会话面板** | 点击 🕘 弹出会话列表：标题 + 条数 + 日期，支持切换 / 删除，当前会话高亮 |
| **双主题适配** | 会话栏 + 历史面板全部 `var(--xxx)` token，云顶/深空双主题自动切换 |

### 架构决策

1. **单一真源**：`ccowork.sessions.v1` 为唯一存储键，ccowork.js 悬浮窗与 agent.html 智能体页读写同一数据，两边完全互通。
2. **渐进兼容**：数据结构 `{id, title, time, msgs:[{role,content}]}` 与 agent.html 现有的完全一致，旧会话零迁移成本。
3. **50 条上限**：`saveSessData` 截断到最近 50 个会话，防止 localStorage 膨胀。
4. **chatHistory 保留为窗口**：`chatHistory` 数组（最近 8 条）继续作为 API 发送的上下文窗口，不影响 token 用量；持久化存全量。

### 验证

| 项 | 结果 |
|---|---|
| `node --check ccowork.js` | ✅ 语法全绿 |
| `scripts/prepare-deploy.mjs` 部署同步 | ✅ diff 一致，密钥注入通过 |

### A 线总览更新

| 任务 | 状态 |
|---|---|
| A1 git 版本控制 | ✅ |
| A2 目录治理 | ✅ |
| A3 全站搜索 | ✅ |
| A4 导航单一真源 | ✅ |
| **A5 对话会话持久化** | **✅ 本次完成** |
| A6 统计埋点 | 🟡 待认领 |
| A7 部署上线 | 🟡 待认领 |

### 下一步建议

1. A6 统计埋点：前端本地统计已有（B4 的 stats.js），A6 升级为服务端统计（需 A7 部署后做）
2. A7 部署上线：评估 Zeabur / VPS 方案，让 server.mjs AI 代理真正生效
3. C2 学习路径：与 A5 会话持久化模式类似，可复用 localStorage + 注入架构

---

## 2026-08-31 · A6 服务端统计 + A7 部署准备（完成，A 线闭环）

### 每日例行

| 项 | 结果 |
|---|---|
| git status | 有未提交改动（博客 3 篇 + 目录页 + 新博文 + 临时文件） |
| 代码审查 | 内容改动（SVG 封面 / 上下篇导航 / 目录 29→33）合规；发现博客页 SVG 封面重复 + 出处声明重复（内容冗余，记为 C 线优化项） |
| 临时文件清理 | 根目录 15 个临时脚本/文件移至 `_archive/temp-20260831/` |
| 提交 | `da407c1` chore(content): 博客目录重构 + SVG封面 + 上下篇导航 + 清理临时脚本 |
| 备份 | `_archive/pre-a6a7-backup-20260831/`（server.mjs / stats.js / Dockerfile / .gitignore） |

### A6 服务端统计埋点 ✅

**背景**：B4 已有前端 localStorage 本地统计（单机数据），A6 升级为服务端聚合统计，部署后全站共享真实热榜。

**交付**：

| 模块 | 文件 | 说明 |
|---|---|---|
| 服务端统计引擎 | `server.mjs`（+140 行） | 内存聚合 + 60 秒落盘 + 30 天归档 + IP 限流 + 优雅关闭落盘 |
| 统计 API | `server.mjs`（4 端点） | POST `/api/stats/view` · GET `/api/stats/hot?n=5` · GET `/api/stats/summary` · GET `/api/stats/pages` |
| 客户端双模式 | `stats.js`（重写） | 自动检测服务端 → 服务端优先 · localStorage 降级 · 60 秒热榜缓存 · API 向后兼容 |
| 持久化文件 | `data/server-stats.json` | 运行时生成，已加入 `.gitignore`，不入库 |

**架构决策（ADR）**：

1. **双模式降级**：stats.js 首次访问探测 `/api/stats/summary`，成功则走服务端，失败降级 localStorage；模式缓存于 `ccowork.statsMode`，下次直接使用。保证纯静态托管和 Node 部署两种场景都能用。
2. **内存优先 + 定时落盘**：统计全量在内存聚合（读写 O(1)），每 60 秒异步写入 JSON；SIGTERM/SIGINT 强制落盘。避免每次请求刷盘拖慢响应。
3. **隐私友好**：不存储 IP、不存完整 User-Agent、Referrer 只存域名；限流用的 IP 仅内存 Map，不落盘。
4. **限流防刷**：单 IP 每秒最多 5 次上报（429 拒绝），兼容 X-Forwarded-For 反代场景。
5. **向后兼容**：`window.CCOWorkStats.getHot()` 新增回调参数（服务端模式异步），无回调时本地模式同步返回，旧页面调用不受影响。

### A7 部署上线准备 ✅

**交付**：

| 产出 | 说明 |
|---|---|
| `Dockerfile` 优化 | 新增非 root 用户（appuser）运行 · `NODE_ENV=production` · 权限收敛 |
| `.dockerignore` 完善 | 排除开发脚本 / docs / _internal / *.py / 运行时数据，镜像更纯净 |
| `scripts/verify-deploy.mjs`（新） | 部署后一键验证：10 项检查（首页/健康检查/统计 API×3/静态资源×2/搜索索引/CORS/404），全绿才通过 |
| `prepare-deploy.mjs` 增强 | data 目录复制排除 `server-stats.json`（运行时数据不进部署包） |
| `.gitignore` 更新 | 纳入 `data/server-stats.json` |

**部署方式（三档可选）**：

| 方式 | 适合场景 | 说明 |
|---|---|---|
| Docker（推荐） | 云平台 / VPS | `docker build -t ai-jiyuan .` + 环境变量注入密钥 |
| 裸机 Node | 轻量服务器 | `node server.mjs`，PM2 守护，零依赖 |
| 纯静态托管 | GitHub Pages 等 | 统计自动降级 localStorage，AI 功能需用户自填 Key |

### 验证结果

| 测试 | 结果 |
|---|---|
| `node --check server.mjs / stats.js` | ✅ 语法全绿 |
| `scripts/verify-deploy.mjs`（10 项） | ✅ **10/10 全绿** |
| 统计 API · view 上报 → hot 可见 | ✅ 正常 |
| 健康检查含统计指标 | ✅ totalViews / totalPages |
| 优雅关闭落盘 | ✅ SIGINT/SIGTERM 触发 saveStats |

### 架构审查（架构师视角）

| 维度 | 评估 | 说明 |
|---|---|---|
| **可扩展性** | ✅ 优秀 | 统计 API 独立模块，新增指标只需扩展 `recordView` 与 `getStatsSummary`；stats.js 双模式架构，未来接入真实分析平台（如 Plausible）只需替换服务端实现 |
| **单一职责** | ✅ 良好 | server.mjs 统计模块独立分区（`==== 轻量访问统计 ====` 标注）；stats.js 分「本地模式 / 服务端模式 / 模式检测 / 统一 API / 渲染」五层，每层职责清晰 |
| **性能** | ✅ 良好 | 内存聚合 O(1) 写入 · 60 秒批量落盘 · 热榜服务端缓存 60 秒 + 客户端缓存 60 秒 · 限流 5 req/s/IP；单页上报用 `keepalive: true` 不阻塞页面卸载 |
| **安全** | ✅ 良好 | 密钥仍仅服务端持有（不变）· 统计不存 IP/完整 UA（隐私保护）· 限流防刷 · 输入长度限制（path 500 / title 200）· 403 代理白名单不变 · Docker 非 root 运行 · .dockerignore 排除密钥 |
| ⚠️ 待改进 | — | 1. 统计数据无认证接口，任何人可调用 `/api/stats/pages` 查看全量页面（低风险，都是公开页面）；2. server.mjs 路由为 if-else 线性匹配，超过 10 个端点后建议改路由表（当前 6 个，可接受） |

### A 线总览（终态）

| 任务 | 状态 | 提交 |
|---|---|---|
| A1 git 版本控制 | ✅ | `ece812d` |
| A2 目录治理 | ✅ | `ece812d` |
| A3 全站搜索 | ✅ | `c4867f5` |
| A4 导航单一真源 | ✅ | — |
| A5 对话会话持久化 | ✅ | — |
| **A6 统计埋点** | **✅ 本次完成** | **（待提交）** |
| **A7 部署上线准备** | **✅ 本次完成** | **（待提交）** |

> A 线工程地基全部完工（A1–A7）。A7「部署上线」定义为**工程准备完成**（Docker/验证脚本/安全配置就绪），实际部署到云平台需老罗选定平台后执行（Zeabur / 轻量应用服务器 / VPS 均可）。

### 下一步建议

1. **实际部署**：选定云平台后，用 `verify-deploy.mjs` 做上线验收
2. **B 线深化**：A6 服务端统计可用后，B4 热榜可升级为真实全站数据
3. **C 线继续**：C2 学习路径追踪（复用 A5 的 localStorage + 注入架构）
4. **内容优化**：博客页 SVG 封面重复 / 出处声明重复（C 线内容工厂顺手修）

---

## 2026-08-31 · B 线内容增长运营（每日执行）

> 执行：AI（B 线内容增长通监）｜ 站点：ccowork-site/AI创作纪元 ｜ 基线 commit：4343fd3（git 作备份，改动可回滚）

### 一、内容质量审查（爆款化小步优化）

**问题**：近期 3 篇爆款博文存在 markdown 表格未渲染 bug——`gen-viral.mjs` 生成的对照表以 `| 列 | 列 |` 语法塞进 `<p>` 标签，前端显示为一堆竖线而非表格，严重影响阅读体验与 SEO（表格是 featured snippet 富结果的高权重组件）。

**处置**（内容向、不编造、数据取自原文，复用站点 `article table` 样式）：

| 博文 | 修复表格 |
|---|---|
| `2026-08-30-爆款-17个AI工具按场景怎么选` | 1（工具类型对照表） |
| `2026-08-28-爆款-每天加班3小时到准点走` | 1（3 工具场景对照表） |
| `2026-08-30-爆款-5个免费AI工具救了我大学4年` | 2（论文写作边界表 + 文献拆解模板表） |

验证：blog 目录 `<p>\s*\|` 模式已清零。**根因**：`gen-viral.mjs` 未转表格为 HTML，属工程向，记录待 A 线修复（今日只做已发布内容的内容向修复）。

**爆款化评估**（近期 4 篇爆款 08-25~08-30）：标题钩子 ✅（反常识+数字+痛点）/ 开篇 ✅（痛点共鸣）/ 结构 ✅（场景分章+对照表+行动清单）/ 转化点 ⚠️（有行动清单但缺站内 CTA，仅上下篇导航，建议后续加"相关阅读"模块）。

### 二、B1 SEO 基础深化（gen-seo.mjs v2）

首轮（08-30）已补 description/keywords/sitemap/rss，今日补齐社交分享与结构化数据缺口：

| 缺口 | 处置 | 量 |
|---|---|---|
| `robots.txt` 缺失 | 新生成（Allow: / + Sitemap 指引） | 1 |
| 无 `canonical` | 全站补 `<link rel="canonical">` | 250 页 |
| 博客缺 `og:title/og:image` | 全站幂等补齐 | og:title +102 / og:image +239 |
| 无 `twitter:card` 全套 | 补 card/title/desc/image | 239/250/249/250 |
| 无 `og:url` | 全站补 | 250 |
| 无 JSON-LD | 首页 `WebSite`(含 SearchAction) + 博客 `BlogPosting`(34 篇) | 35 |
| 首页 `og:description` 重复 | 去除错误 `name=og:description`，保留 `property=` | 1 |
| 脏 description | 加强检测（"每日爆款引擎"模板残留）后重写 | 7 |

**脚本**：`scripts/gen-seo.mjs` 升级 v2，幂等可每日重跑（`node scripts/gen-seo.mjs`，`--dry` 试跑）。所有补齐均"已有则跳过"，不覆盖人工标签。
**验证**：首页 WebSite schema（含 SearchAction）+ 博客 BlogPosting schema 正确注入；robots.txt / sitemap(250 URL) / rss(34 篇) 已生成。

### 三、内容增长视角审查

- **选题热度**：近期选题精准踩在四大流量入口——AI工具实测 / 变现 / 职场效率 / 学生人群，与站点定位一致，方向对路。
- **SEO关键词**：全站 keywords 已覆盖（246 已有 + 4 新补）。短板：博客 keywords 多为标题直接拆词，缺搜索意图后缀（"实测/对比/免费/教程/怎么做"）。建议 `extractKeywords` 补意图词。
- **可传播性**：今日补齐 og/twitter 全套 + JSON-LD 后，社交分享预览完整、Google 富结果友好。剩余短板：博文缺社交分享按钮（一键转发微信/微博/X），建议加轻量分享组件。

### 四、B2–B5 深化建议（首轮已完成，列下一步）

| 线 | 现状 | 下一步深化 |
|---|---|---|
| B2 内容日历 | 35 选题 E01-E35 + 时间矩阵 | ①选题库补搜索意图标签；②gen-viral.mjs 修表格转 HTML 根因 |
| B3 书系 | AI实战全书 EPUB+PDF 打样 | ①五卷全书也导出 EPUB；②书页加"在线读→下载"转化入口 |
| B4 统计热榜 | 前端埋点+服务端 API 就绪 | ①热榜数据回填博文页"本周热读"模块；②统计 dashboard 可视化 |
| B5 变现 | 三支柱方案+纯文案预告 | ①会员墙轻量门控方案；②课程页与学院测验打通（证书变现） |

### 五、产出清单

- 改动脚本：`scripts/gen-seo.mjs`（v2：+robots/canonical/og/twitter/JSON-LD/去重/脏描述检测）
- 新生成：`robots.txt`、`sitemap.xml`(刷新)、`rss.xml`(刷新)
- 内容修复：3 篇爆款博文 4 个表格（markdown→HTML table）
- SEO 标签：250 页补 canonical/og/twitter，35 页加 JSON-LD
- 本报告：`docs/site-progress.md` 追加

### 下一步建议
1. **A 线**：修 `gen-viral.mjs` 表格转 HTML 根因（防新增博文再出 bug）
2. **B1**：`extractKeywords` 补搜索意图后缀词；博文加社交分享组件
3. **B2-B5**：按上表深化建议推进
4. **提交**：今日改动待老罗审查后 commit

---

## 2026-08-31 · C2 学习路径追踪（完成，C 线第二阶段）

> 执行：C 线学习平台产品化（产品通监管）｜ 站点：ccowork-site/AI创作纪元 ｜ 基线备份：`_archive/c2-backup-20260831/`

### 一、产品审查（每日 UX/转化小步优化）

**审查发现：**

| # | 问题 | 影响 | 今日处置 |
|---|---|---|---|
| UX1 | 章节读完无收尾动作——用户滚到底部后直接离开，没有「确认学会」的仪式感 | 学习闭环断裂、复访率低 | ✅ C2 章节打卡卡片（底部注入，含进度统计 + 连续天数 + 跳转推荐） |
| UX2 | 学院首页 Hero 下方缺「我的进度」锚点——回访用户找不到上次学到哪 | 复访转化路径长、流失率高 | ✅ 学院首页新增进度卡（有进度才显示，渐进式呈现） |
| UX3 | 路线图是静态的——14 周计划完成与否全靠用户自己记 | 进度感弱、坚持难 | ✅ 路线图页动态渲染：阶段完成数 + ✅ 标记 + 整周完成高亮 |
| UX4 | 认证考试无前置引导——用户可能直接挑战难的，考挂了流失 | 考试体验差、挫败感强 | ✅ 软门槛 + 前置进度条 + 「建议先学 N 章」温和提醒 |

**爆款化视角审查（C 线转化）：**

- **启动钩子**：打卡功能的「连续学习天数」是强留存钩子（习惯养成机制），与游戏化设计吻合 ✅
- **转化链路**：章节 → 打卡 → 推荐下一章 → 路线图 → 测验 → 证书，闭环完整 ✅
- **待提升**：首页学院入口卡未接入迷你进度（P5），下次小步补上

### 二、C2 交付清单

| 模块 | 文件 | 改动量 | 说明 |
|---|---|---|---|
| 章节打卡注入 | `module.js`（v21→v22） | +170 行 | ⑦ 章节打卡模块：30 章统一注入 + `window.CCOWorkProgress` 全局 API |
| 学院首页进度 | `website/ai-academy.html` | +48 行 | Hero 下方进度卡（有进度才显示）+ 推荐下一章 |
| 路线图打卡状态 | `website/ai-academy-roadmap.html` | +87 行 | 进度总览 + 四阶段完成数 + ✅ 标记 + 14 周表格行高亮 |
| 认证前置门槛 | `website/ai-academy-quiz.html` | +36 行 | 每科前置进度条 + 软门槛提醒（仍可「直接挑战」） |
| 产品文档 | `docs/learning-platform-prd.md` | 重写 v0.2 | C2 详细设计 + 产品决策记录 + 验收标准 + 路线图更新 |

### 三、关键产品决策（ADR）

| # | 决策 | 权衡与理由 |
|---|---|---|
| D1 | 注入式实现（module.js），不改单页 HTML | 30 章统一注入，维护成本极低；未来新增章节自动获得打卡能力。代价：依赖 DOM 结构（article 选择器） |
| D2 | 新用户不显示进度卡（渐进式呈现） | 空进度条制造焦虑 > 激励作用；第一次打卡后自然出现，惊喜感更强。类似 Notion「空白页不弹引导」的哲学 |
| D3 | 软门槛而非硬阻断 | 信任用户的自我判断；「建议先学」是引导不是限制。硬门槛会导致「我偏要考」的逆反心理流失 |
| D4 | 连续打卡用自然日（0 点重置） | 符合中文用户心智（「今天学了」= 日历日）；比「24 小时制」更易理解、更易坚持 |
| D5 | 打卡 = 用户主动确认，不是系统判断「是否学会」 | 诚实原则：我们不做能力评估，只做学习记录工具。把主权还给用户 |

### 四、数据结构与 API

```
localStorage: ccowork.progress
{
  chapters: { "chapter-01": { title, firstReadAt, completedAt }, ... },
  streak: 3,              // 连续学习天数
  lastCheckIn: "2026-08-31",
  totalCompleted: 5,
  startedAt: "2026-08-28"
}

全局 API: window.CCOWorkProgress
- get() / save(p)
- isChapterCompleted(chId)
- getCompletedCount()
- TOTAL_CHAPTERS = 30
```

### 五、验证与质量

| 项 | 结果 |
|---|---|
| `node --check module.js` | ✅ 语法通过 |
| `ai-academy-quiz.html` 内联脚本语法 | ✅ 通过 |
| 注入幂等性（`#modCheckIn` 守卫） | ✅ 重复加载不重复注入 |
| 双主题适配 | ✅ 使用 `var(--token)`，深浅色自动适配 |
| 容错处理 | ✅ 整个模块 try-catch，打卡失败不影响页面核心功能 |
| 零 JS 错误（预期） | ✅ 无语法错误，逻辑分支均有守卫 |

### 六、C 线状态更新

| 任务 | 状态 | 备注 |
|---|---|---|
| **C1 学院测验 + 证书** | ✅ 完成 | 16/16 Playwright 验证通过 |
| **C2 学习路径追踪** | **✅ 本次完成** | 章节打卡 + 进度条 + 路线图 + 考试软门槛 |
| C3 lab 仿真在线化 | ⏳ 下一步 | 前端 JS 仿真优先 |
| C4 AI 助教 | ⏳ 待办 | 章节页嵌入上下文答疑 |

### 七、下一步建议

1. **C3 优先**：盘点 lab/simulation 的 Python 脚本，评估哪些可转为前端 JS 仿真（优先选可视化效果好、交互性强的，如 PID、弹簧、摆）
2. **小步优化**：
   - 首页学院入口卡加「我的进度」迷你展示（P5）
   - 题库扩充：补 prompt/multi/eng/eval/apply 五域（解锁 CERT01/04）
3. **数据验证**：下次运行加 Playwright 端到端验证（打卡 → 进度条 → 路线图标记 → 考试门槛）
4. **提交**：今日改动待老罗审查后 commit

---

*本文档 append-only，每日运行追加新段落。*

## 2026-08-31 · A 线例行巡检 + 未提交增量审查（A 线闭环后维护）

### 一、A 线状态确认
- **A1–A7 全部闭环**（基线 ece812d → A5 `d583611` → A6+A7 `4343fd3`）。本日无新 A 任务可认领。
- A7 定义为**工程准备完成**：实际部署到云平台仍待老罗选定（Zeabur / 轻量应用服务器 / VPS），选定后执行使 server.mjs AI 代理生效。

### 二、工作区增量审查（git status 全量）
| 类别 | 内容 | 审查结论 |
|---|---|---|
| C2 章节打卡 | module.js +190 行（进度读写/打卡/连续天数/API） | ✅ 功能完整；**修复重复 var 声明 2 处 + 重复 API 定义 1 处**（保留含 save 的完整版） |
| B1 SEO v2 | index.html + gen-seo.mjs v2 + 全站 200+ 页面 canonical/og/twitter/JSON-LD | ✅ 幂等注入、`\u003c` 转义防 XSS、mtime 不编造日期 |
| 内容管线 | data/news.js / ai-tools.json / editorial-calendar.js + 新博文 2 篇 + gen-weekly.mjs 周更脚本 | ✅ 零依赖 + 密钥走 .env（三级降级：智谱→方舟→DeepSeek） |
| 基础设施 | robots.txt 纳入版本控制 | ✅ 含 Sitemap 指向部署链接 |

### 三、安全审查
- git diff + 未跟踪文件密钥扫描：**无 API Key / Secret / Token 落浏览器**（0 命中）
- gen-weekly.mjs 读 .env 不落盘到浏览器侧 ✅

### 四、测试回归（全部通过）
| 套件 | 结果 |
|---|---|
| A3 搜索 Node 单测 | ✅ 15/15 |
| A4 导航 UI 测试（Playwright） | ✅ 19/19 |
| C1 测验+证书（Playwright） | ✅ 16/16 |
| C2 打卡端到端（新增 Playwright 抽查） | ✅ 章节页注入 / API 暴露 / 点击写入 localStorage / 按钮态 / 非章节页不注入 / 零 JS 错误 |

### 五、提交链（本次）
- `feat(module): C2 章节打卡与学习进度（清理重复声明）`
- `chore(content): B1 SEO v2 全站补齐 + gen-weekly 周更脚本 + 每日内容更新`
- `chore(memory): 自动化记忆归档 + PRD 更新`

### 六、后续跟踪（已记 TaskCreate）
1. A7 部署落地：老罗选定云平台后执行（server.mjs AI 代理生效 + README 更新）
2. C3 lab 仿真在线化（前端 JS 仿真优先：PID/弹簧/摆）
3. C4 AI 助教（章节页上下文答疑）

---

## 2026-08-31 · B 线（内容增长运营）· 爆款炼金师监管

### 一、内容质量审查（爆款化小步优化）

| 项 | 结果 |
|---|---|
| **修复 3 篇爆款博客重复头图 bug** | 「深度长文」旧 SVG 与「🔥 爆款生产线」新 SVG 叠加渲染（并发封面注入遗留）。`scripts/fix-dup-svg.mjs` 幂等修复，保留爆款生产线版，3/3 篇处理后剩余 svg=1，首屏视觉恢复正常 |
| **今日周报《本周 AI 大事记》钩子化** | og/description 由功能描述 → 事实钩子（GPT-5o 发布、Llama 4 开源 1.2 万亿参数、豆包 4.5 千万 token、IDC 推理算力翻倍——全部提炼自正文，不编造）；keywords 补充 GPT-5o/Llama 4/豆包4.5 实体词；blockquote 去重复「本周」、聚焦三条主线 |
| **博客目录页 title 品牌统一**（遗留项✅） | `博客目录 · 白驹全局大脑` → `博客目录 · AI 创作纪元（离线版）`，og:title 同步，description 加「真实可核验、每日更新」 |
| **抽查爆款博客 description** | 3 篇均为钩子式（「别神话AI…」「我靠5个免费AI工具…绩点3.8」），质量达标，无需改动 |

### 二、B 线遗留项推进

| 项 | 结果 |
|---|---|
| **B3 二期：五卷全书 EPUB 打样** | 新增 `scripts/gen-book-epub2.py`（复用 extract_article，零依赖）：总目录→总序→科技史→3 工具书→第五/六卷→3 附录，11 章 45.7KB；**同步修复原 gen-book-epub.py 空元素未自闭合 bug（`<hr>/<br>` → `<hr/>/<br/>`）并重生成 AI实战全书.epub**；两本 EPUB XML 全合法（minidom 逐文件校验） |
| **书库页下载入口** | website/book/index.html 新增「📚 五卷全书 · EPUB」下载块（46KB，带 download 属性） |

### 三、内容增长视角审查

- **选题热度 ✅**：周报覆盖 GPT-5o / Llama 4 / 豆包 4.5 / IDC 数据，当周高热话题全覆盖
- **SEO ✅**：sitemap.xml 251 URL、rss.xml 35 篇；gen-seo.mjs 重跑后 rss 周报 description 已同步最新钩子；keywords 补实体词
- **可传播性 ✅**：首屏 bug 修复（传播锚点回归正常）、钩子摘要就位；不编造数据（全部钩子提炼自正文事实）

### 四、验证与同步

- deploy 镜像 diff 一致：3 篇 svg=1、title 品牌统一、五卷全书.epub（46KB）在镜像、书库页入口 1 处、周报钩子 2 处
- 备份：`_archive/bline-20260831/`（blog 36 文件）
- 新脚本：`scripts/fix-dup-svg.mjs`、`scripts/gen-book-epub2.py`

### 五、待办队列

1. **B3 三期**：五卷全书 PDF 版（对标 AI实战全书 PDF，Playwright print-to-PDF）+ 对齐之路/具身智能/中国科技故事 18 篇 EPUB
2. **B5 二期**：老罗拍板支付通道与定价（会员/课程）后落地收银台
3. 周报可加「下周一分钟行动清单」固定收尾（提升转化点）

*本文档 append-only，每日运行追加新段落。*
## 2026-08-31 · C3 lab 仿真在线化（完成，C 线第三阶段 · 产品通监管）

### 一、背景修正（产品审查发现）

盘点 lab/simulation：**并无 .py 文件**（仅 3 个 HTML 讲解页），但 lab/index.html 展示了 11 个 `python xxx.py` 命令卡片 —— 全部死链。同时 simlab.html 已有 5 个纯前端 JS 仿真但未纳入学习路径。故 C3 = 修死链（补真实脚本）+ 补在线化缺失环（实验打卡）+ 打通学院入口。

### 二、交付物

| 文件 | 职责 |
|---|---|
| `lab/simulation/01-10_*.py`（新增 ×10） | PID/弹簧/抛体/RC/蒙特卡洛/单摆/直流电机/热传导/Lotka-Volterra/波动方程，零依赖欧拉积分，理论值对照 |
| `lab/simulation/test_simulation.py`（新增） | pytest 校验 10 脚本（13 项断言，实跑 13/13 通过） |
| `lab/index.html` | 修复 11 死链 → 下载链接 + 5 在线版对照；修 2 处缺 href 坏链接；删 1 处死内容 |
| `lab/simlab.html` | 5 卡加「✅ 记录实验完成」→ `ccowork.progress.labs`，幂等 |
| `module.js`（v23） | `CCOWorkProgress.recordLab/isLabCompleted/getLabs`，实验打卡共享连续天数 |
| `website/ai-academy.html` | Hero 新增「🧪 lab 仿真实验室」入口 chip |
| `scripts/verify-c3.mjs` | C3 端到端验证 13 项 |

### 三、质量验证

- **Python 实跑**：10 脚本全部真实运行；07 直流电机修复仿真时长（8τ 自适应）、10 波动方程修复初始条件（零初速度 u_prev=u_cur）+ 物理判据改面积守恒
- **Playwright 13/13 通过**：下载 200×11 / 在线版 5 / 无死链接 / 仿真自动出结果 / 打卡写入+幂等 / 学院入口 / API 可用 / 零 JS 错误（仅放行 /api/stats 纯静态已知降级）
- 备份：`_archive/c3-backup-20260831/`

### 四、产品决策（记录于 PRD D6-D10）

补脚本不删卡（双通道互证）；实验打卡独立 labs 字段但共享连续天数；纯前端 JS 仿真不做 /api/run（纯静态托管）；simlab 打卡自包含兜底。

### 五、待办队列

1. **C4 AI 助教**：章节页嵌入上下文感知答疑（复用 ai-client.js + DSH 能力）
2. lab「仿真挑战题」（调 PID 零超调解锁徽章）——可联动打卡体系
3. 蒙特卡洛固定随机种子（P9，教学可复现）
4. 题库扩充 10 域 130 题解锁 CERT 01/04（P1 延续）

*本文档 append-only，每日运行追加新段落。*
## 2026-09-01 · C4 AI 助教（完成，C 线第四阶段 · 产品通监管）

### 一、交付物

| 文件 | 职责 |
|---|---|
| `ai-tutor.js`（新增） | 注入式 AI 助教：章节页右下角「🎓 AI 助教」浮动按钮 → 上下文感知对话面板（流式回答 / 快捷问题 / 模型切换 / Key 配置 / 历史记录，全 localStorage） |
| `module.js`（v24） | ⑧ 章节页懒加载注入 ai-tutor.js（32 章零页面改动）；`CCOWorkProgress.getTutor()` API |
| `website/ai-academy.html` | Hero 新增「AI 助教 · 随章答疑」chip；进度卡加助教互动统计位（有互动才显示） |
| `scripts/verify-c4.mjs`（新增） | C4 端到端验证 13 项（内置静态服务器 + mock AI，不依赖真实 Key） |

### 二、产品规则要点

- **上下文感知**：自动提取章节标题 + h2/h3 目录骨架 + 正文摘要注入 system prompt；快捷问题按本章目录动态生成
- **不打扰**：按钮常驻不自动弹；面板点击才开；「思考中」占位 + 流式渲染 + 可停止
- **模型**：智谱 GLM-4.7-Flash（免费默认）→ DeepSeek → 方舟；本地后端自动走服务端密钥，纯静态时用户自填 Key（仅存本机）
- **数据本地化**：`ccowork.tutor`（model/asked/lastAskAt/history ≤20 轮），可一键清除；并入学习活跃度但不计入章节完成度
- **诚实原则**：回答标注「AI 生成仅供参考」；system prompt 强制「不确定必须明说、不编造」

### 三、质量验证

- **Playwright 13/13 通过**：FAB 注入 / 面板展开 / 章节识别 / 快捷问题 / 无 Key 引导 / 流式回答（mock）/ 历史写入 / 计数刷新 / 非章节页不注入 / 学院入口 chip / 进度卡统计位 / getTutor API / 零 JS 错误
- **deep 主题适配**：FAB 青蓝极光渐变 + 面板深色玻璃（rgba(8,12,22,.95)），零 JS 错误
- **修复真 bug**：① FAB 初始右下角被 ccowork-pet（62px 悬浮宠物 z9999）完全遮挡 → 右移避让 right:92px + 面板 z-index 10000；② 提问计数不即时刷新 → finish() 后 updateAsked()
- 备份：`_archive/c4-backup-20260901/`（module.js + ai-academy.html）

### 四、产品决策（记录于 PRD D11-D16）

独立文件按需注入（D11）；DOM 提取上下文零维护（D12）；助教统计不入完成度（D13）；避让宠物不侵入（D14）；思考占位+流式+停止（D15）；引导内嵌不弹层（D16）。

### 五、待办队列

1. **平台化收尾**：助教真实 API 联调评测（章节问答准确率抽查）、lab 仿真挑战题、证书云查验、学习数据 JSON 导入/导出（跨设备）
2. 蒙特卡洛固定随机种子（P9）
3. 题库扩充 10 域 130 题解锁 CERT 01/04（P1 延续）
4. 首页学院入口「我的进度」迷你展示（P5）

*本文档 append-only，每日运行追加新段落。*

## 2026-09-01（A 线巡检 · gen-seo 危机处置 + 防回退资产）

### 一、git 巡检与提交链（8 个提交，工作区恢复干净）
`fb6c8f2`(A线修复) → `dcaad22`(C4 助教) → `e77e561`(内容增量) → `d8e1bda`(B3/C4 配套) → `58d280f`(opt-blog 守卫) → `78df1f4`(头图清理) → `fc45fbb`(PRD v0.4)

### 二、🔴 事件：gen-seo 破坏全站 256 页 → 已恢复 + 根因修复
- **触发**：为清理 simlab.html 的 og:description 内嵌图标，修改 cleanDescMeta 时正则误用 `[\s\S]*`（跨行贪婪），把每个页面从第一个 description meta 起整体替换为纯文本——**256 页结构破坏**
- **恢复**：deploy/ 镜像（prepare-deploy 同步副本，gen-seo 的 EXCLUDE 列表天然保护）→ 257 html 全量回拷，损坏残留仅 1 处（simlab 历史遗留）
- **根因修复**（gen-seo.mjs）：
  1. cleanDescMeta 支持 name/og:description 内嵌 HTML 标签清理（模板图标残留）
  2. 替换正则引号锚定（`content="..."` 整体匹配，防 content 内引号/尖括号截断）
  3. **行内贪婪 `.*`**（严禁 `[\s\S]*` 跨行）——注释已写明警示
  4. isDirty 增补 HTML 标签检测兜底
- **验证**：全站 266 页 node 校验 0 结构破坏 / 0 脏 meta；幂等重跑改动 0；A3 搜索回归 15/15

### 三、新防回退资产
- `scripts/fix-blog-index-ui.mjs`（幂等）：B 线管线重建 blog/index.html 用旧模板 → 一键恢复 cc-ic 图标体系（41 处）+ cc-pg-cover + canonical/og；已随本提交入库

### 四、并发协作观察（多会话同时开发，需协调）
- 巡检期间发现并提交了并发的 C4 AI 助教（module.js v24 + ai-tutor.js）、B3 书系导出（epub3/pdf2）、PRD v0.4
- **风险提示**：多会话并发改同一文件（gen-seo.mjs 被并发增强 isDirty、simlab 被反复覆盖），建议高频工程文件（gen-seo/fix-blog-index-ui/prepare-deploy）明确单一 owner

### 五、遗留与待办
- blog/index.html 的「索引重建」仍是手工/半自动（管线用旧模板），已建 fix 脚本兜底；长期建议把索引生成脚本化（单一真源）
- data/.gen-cursor.json（bookIndex 游标）为运行时状态，考虑 gitignore（观察中）
- C4 AI 助教需老罗实测（章节页浮动按钮 → 对话 → 历史持久化）

*本文档 append-only，每日运行追加新段落。*

---

## 2026-09-01 · B 线（内容增长运营）· 爆款炼金师监管 · 第二次运行

### 一、内容质量审查（爆款化小步优化）

| 项 | 结果 |
|---|---|
| **今日 2 篇新博客缺 SEO meta（16 时检查为 0）** | gen-seo 幂等补齐 description（从正文钩子段提取）；其中 Agent 实测篇首次提取出**脏摘要**（「🔥 爆款生产线 · … AI 生成 · 信息以官方为准 · 每日爆款引擎」模板头残留 + 标题重复拼接） |
| **gen-seo.mjs 剥离逻辑增强（永久修复）** | 根因：`bodyText` 只剥 ⏱/📅/🔥 开篇且 `t.indexOf('🔥') < 60` 才生效，旧「深度长文」+新「爆款生产线」双重模板头无法剥离（首 🔥 在位置 78）。新增 TPL_PREFIXES 循环剥离（≤8 轮，命中模板词才剥）+ extractDesc 过滤模板残留段 + isDirty 增加「AI 生成 · 以官方为准 / 爆款生产线」模式。修复后重跑：今日 2 篇 description 均为干净钩子（「你是不是也遇到过这些糟心情况…」「过去3年我们见过太多“颠覆所有行业”的叙事…」） |
| **修复 4 篇爆款博客重复 SVG 头图**（8-28×1 + 8-30×2 + 今日×1） | 根因：`opt-blog.py` 封面注入条件只查 `bgrad`，gen-viral 新头图用渐变 id="vg" → 被判定「无封面」重复注入旧「深度长文」版。**已根治**：opt-blog.py 注入守卫改为「article 内已有 1200x240 封面 SVG 则不注入」+ 已处理判定去掉 bgrad 依赖；存量用 fix-dup-svg.mjs 清理 4/4（svg=1） |
| **人工修复 2 页 description** | ai-academy-national.html（「加载中…」占位残留→页面真实内容提炼）、assistant.html（跳转页无正文无法自动提取→手工补） |
| **终态** | 256/256 页 description 合格、0 待改；sitemap 258 URL / rss 38 篇 |

### 二、B3 三期推进（书系资产化）

| 项 | 结果 |
|---|---|
| **《五卷全书.pdf》** | 新脚本 `scripts/gen-book-pdf2.mjs`（Playwright print-to-PDF，章节序与 epub2 一致：总目录→总序→科技史→3 工具书→五六卷→3 附录）：**11 章 3.2MB A4** |
| **《中国科技故事.epub》** | 新脚本 `scripts/gen-book-epub3.py`（复用 extract_article，支持多书目）：**19 章**（README 目录 + 18 篇），45.7KB |
| **《对齐之路.epub》《具身智能.epub》** | 单本导出 15.3KB / 13.8KB；**修复裸 & 转义 bug**（对齐之路正文「Sutskever & Leike」→ `&amp;`，XHTML invalid token） |
| **XML 全校验** | 3 本 EPUB：zip 完整性 + mimetype + 全部 XHTML/OPF/NCX minidom 解析全通过 |
| **书库页入口** | website/book/index.html 新增 4 个下载块（五卷全书.pdf / 中国科技故事.epub / 对齐之路.epub / 具身智能.epub，均带 download 属性） |

### 三、内容增长视角审查

- **选题热度 ✅**：今日 Agent 实测文（OpenClaw 2.0）+ 大模型落地观察（端侧推理 ROI）均属高热话题；description 钩子聚焦痛点（「聊半小时就忘前情」「单token成本降到0.0001元」）
- **SEO ✅**：sitemap 258 URL（256+2 增量）、rss 38 篇；脏摘要清零；256/256 description 合格
- **可传播性 ✅**：首屏双头图 bug 根治（源头 opt-blog.py 守卫入库，非一次性清理）；4 篇爆款博客首屏视觉恢复正常

### 四、验证与同步

- Playwright 全绿：书库 4 下载入口 + 文件存在（五卷全书.pdf 3.2MB）+ 今日博客 svg=1 + 零 JS 错误
- deploy 镜像 diff 全一致（书库产物 ×4、书库页、ai-academy-national、assistant、sitemap、rss、4 篇博客）
- 备份：`_archive/bline-20260901/`（gen-seo/opt-blog/fix-dup-svg 脚本 + 书库页）
- git：17:35 并发会话已提交全部 B 线改动（feat B3/C4 + opt-blog 守卫 + 4 篇清理 + chore）

### 五、待办队列

1. **B3 四期**：书系 PDF 推广（对齐之路/具身智能/中国科技故事 可打印版）；书库页可加「整站书系一键打包 ZIP」
2. **B5 二期**：老罗拍板支付通道与定价后落地收银台（会员 ¥19/49、课程 ¥99-199 方案已在 docs/monetization-plan.md）
3. 周报加「下周一分钟行动清单」固定收尾（转化点）
4. **环境注意**：并发会话持续重构 blog/book 页面——B 线改动后立即 fix-dup-svg + prepare-deploy 同步，减少竞态窗口；gen-seo 幂等可放心重跑

*本文档 append-only，每日运行追加新段落。*

---

## 2026-09-02（A 线巡检 · 增量审查提交 ×7）

### 一、git 增量审查（工作区曾积压 40+ 未提交文件，全部归类提交）

| 提交 | 类型 | 内容 |
|---|---|---|
| `a3bcecb` | **fix(A线)** | 学院进度章节 **33→34** 同步 gen-academy 第34章（页面已 34 章，进度条此前 33 章就满格）；`.gen-cursor.json` 运行时游标状态移出版本控制；清理 `ascii_preview.py` 冗余副本（与 ascii-preview.py 完全一致，A2 单一真源） |
| `d844f31` | feat(brand) | 品牌资产包入库：A 方案概念图×3 + 导出套件（favicon/og/apple-touch/manifest）+ 商标×4 + 矢量源 + brand 生成/渲染/打包脚本 + ascii 轮廓校验；移除被取代的临时概念图（0 引用） |
| `9ee4367` | chore(内容) | 快讯×2（IDC AI 工具市场/GPT-5o）+ 学院第 33/34 章 + 博客《9月AI创业观察》+ 书系 13 页补全 + 工具库/项目库/日历 + SEO 全站注入（sitemap 265/rss/品牌页） |
| `d080e6b` | docs(记忆) | 09-01 工作日志与自动化记忆同步 |
| `7925f5b` | feat(内容) | gen-academy 第 33/34 章大纲 + B3 四期书系 PDF×3 入库（对齐之路/具身智能/中国科技故事） |
| `5b2a8f4` | feat(B3) | 书系入口页新增 PDF 打印版下载区 + 整包 ZIP 下载；gen-book-pdf3.mjs 入库；ZIP/`_tmp-*` gitignore（可重打不入库） |
| `0d300c7` | feat(C4) | 认证页新增**备份与恢复**：学习记录导出 JSON + 一键导入（换设备不丢证） |

### 二、架构审查（A 线视角）

- **章节计数一致性修复**：module.js `TOTAL_CHAPTERS` 是唯一被页面引用的进度分母，页面已 34 章但分母停留 33 → 进度条提前满格。已修复并验证（A3 搜索回归 15/15 通过，module.js 改动零副作用）
- **运行时状态出库**：`data/.gen-cursor.json`（书系续写游标）属 LLM 运行时状态，遵循「可再生成不入库」原则移出版本控制
- **A2 单一真源**：`ascii_preview.py` 与 `ascii-preview.py` 逐字节相同（960B），保留 kebab-case 规范命名，删除冗余
- **资产策略梳理**：书系 PDF 有入库先例（AI实战全书/五卷全书）→ 新 3 本保持一致入库；ZIP 整包 12MB 可重打 → gitignore
- **安全**：未跟踪文件 + brand 脚本密钥扫描 0 命中；deploy 密钥注入断言通过（DeepSeek/ARK 均已写入部署副本，密钥不落浏览器源码）

### 三、验证与同步

- A3 搜索核心单测 **15/15 全绿**（module.js 改动后回归）
- 全站 JS 语法检查通过（module.js / gen-academy.mjs / brand-*.mjs）
- prepare-deploy.mjs 同步成功：**deploy/ 211.3MB**，密钥注入断言通过
- 工作区提交后完全干净

### 四、待办队列（新增）

1. **书系 ZIP 下载可用性**：ccowork-book-pack.zip 已 gitignore 但 deploy 镜像已带上（书库页提供下载），部署上线后需实测下载
2. **A7 部署**：仍在等待老罗选择支持 Node 的平台（CloudStudio 纯静态限制，server.mjs AI 代理线上不生效）
3. **并发协作**：本轮 5 个会话并发产生增量（brand/B3/C4/内容），提交节奏已对齐；建议高频工程文件（module.js/.gitignore）变更后立即提交缩短竞态窗口

*本文档 append-only，每日运行追加新段落。*

## 2026-09-02 · B 线（内容增长运营）· 爆款炼金师监管 · 第四次运行

### 一、内容质量审查（今日 2 篇新博客）

| 项 | 结果 |
|---|---|
| **《2026年9月AI创业观察》缺 description** | gen-seo 幂等补齐：**「今天不说虚的，只讲我最近跑下来真实有现金流、没有被巨头盯上、普通人能切入的AI创业机会，以及踩过的坑。」**（干净痛点钩子，从正文提取） |
| **《2026年8月AI变现实录》** | description 已合格（27 个真实账单 / 70% 收入区间锚点）；开篇钩子质量高：具体数字 + 反差（「最夸张的 95 后上月纯利 12.7 万，成本只有 3 个 API 账号和一台 2019 款 MacBook Pro」） |
| **双 SVG 头图** | fix-dup-svg 扫描：0 修复 / 4 跳过（svg=1 全健康）；源头守卫（opt-blog.py）上轮已根治 |
| **标题钩子** | 两篇均符合爆款公式：数字反差（月入 5 万+ / 1200 万营收）+ 否定式悬念（「别追风口/别追通用大模型」） |

### 二、B3 四期推进（书系资产化收尾）

| 项 | 结果 |
|---|---|
| **《对齐之路.pdf》** | 新脚本 `scripts/gen-book-pdf3.mjs`（复用 pdf2 Playwright 模式，支持多书目）：**1 章 1.8MB A4** |
| **《具身智能.pdf》** | **1 章 1.6MB A4** |
| **《中国科技故事.pdf》** | **19 章（README 目录 + 18 篇）3.2MB A4** |
| **整站书系 ZIP** | `scripts/gen-book-pdf3.mjs --no-zip` 内置打包逻辑（Python zipfile 保证 UTF-8 中文文件名）：**ccowork-book-pack.zip 11.5MB（5 EPUB + 5 PDF 共 10 文件）** |
| **书库页入口** | website/book/index.html 新增「PDF 打印版与整包下载」区块：3 个 PDF 入口 + ZIP 一键打包入口（均带 download 属性） |

### 三、内容增长视角审查

- **选题热度 ✅**：今日两篇（AI 变现路径 / AI 垂直创业窗口）均属高热度长尾话题，标题用「数字反差 + 否定式悬念」双钩子
- **SEO ✅**：sitemap 265 URL / rss 39 篇（含今日 2 篇）；补 description 10 / keywords 9 / canonical 9；265/265 description 合格
- **可传播性 ✅**：9 个书库下载入口（4 PDF + 4 EPUB + 1 ZIP）全部就绪，一书多形态分发闭环

### 四、验证与同步

- Playwright 验证：书库 9 下载链接（ZIP 1 / PDF 4）+ 4 产物文件大小 OK + 首页热榜 #ccoworkHot 在位 + 今日 2 篇博客 svg=1；**HTTP 协议复核零 JS 错误**（file:// 下 ERR_FILE_NOT_FOUND 为协议噪声，线上无影响）
- deploy 镜像：4 新产物 md5 全一致（1.8MB / 1.6MB / 3.2MB / 11.5MB）；书库页 / sitemap / rss / 今日博客 diff 全一致
- git：仅提交 B 线自有改动（scripts/gen-book-pdf3.mjs + 书库页 + site-progress）；并发会话的 blog/brand/chapter-33/34 等未触碰

### 五、待办队列

1. **B3 五期（可选）**：书系 PDF 封面页加品牌视觉（当前纯文字封面）；双语 EPUB 导出
2. **B5 二期**：老罗拍板支付通道与定价后落地收银台（会员 ¥19/49、课程 ¥99-199 方案已在 docs/monetization-plan.md）
3. 周报加「下周一分钟行动清单」固定收尾（转化点）
4. **环境注意**：并发会话持续重构 blog/book 页面——B 线改动后立即 prepare-deploy 同步，减少竞态窗口；gen-seo/gen-book-pdf3 均幂等可放心重跑

*本文档 append-only，每日运行追加新段落。*

## 2026-09-02 · B 线（内容增长运营）· 爆款炼金师监管 · 第五次运行

### 一、B3 五期：全站书系品牌封面统一

| 项 | 结果 |
|---|---|
| **共享封面模块** | 新增 `scripts/lib-book-cover.mjs`（CSS + coverHTML 生成器）：深空渐变底 + 品牌徽章「🐎 白驹 · 全局大脑」胶囊 + 渐变分隔线（青→蓝→紫）+ 副标题 + 出品元信息——与站点 deep 主题一致 |
| **三脚本统一引用** | gen-book-pdf.mjs / pdf2.mjs / pdf3.mjs 全部 import { COVER_CSS, coverHTML }，删掉 18 行重复的 cover 样式 + 硬编码 cover div；一处改全站生效 |
| **5 本 PDF 重生成** | AI 实战全书.pdf **4.2MB** 32 章（↑0.3） / 五卷全书.pdf **3.5MB** 11 章（↑0.3） / 对齐之路.pdf **2.1MB**（↑0.3） / 具身智能.pdf **1.9MB**（↑0.3） / 中国科技故事.pdf **3.5MB** 19 章（↑0.3）——体积上升来自渐变背景图（非文字内容） |
| **整包 ZIP 重打包** | ccowork-book-pack.zip **11.9MB**（5 EPUB + 5 PDF 全套） |
| **封面视觉验证** | Playwright 截图直出（深空渐变 + 徽章 + 渐变分隔 + 元信息层级清晰）——品牌全站一致 |

### 二、周报转化点收尾

| 项 | 结果 |
|---|---|
| **《本周 AI 大事记·8月第5周》** | 在「出处声明」前注入「**下周一分钟行动清单**」固定段落（4 条：试新模型 / 关注端侧 / 查预算 / 验证报告）——把周报从「只读摘要」升级为「读完能行动」的转化页 |
| **模板资产化** | 后续周报可复用该模式（建议下期 gen-daily.mjs 排版时同步加） |

### 三、B5 二期：拍板清单（老罗决策卡）

| 项 | 结果 |
|---|---|
| **`docs/monetization-decision.md`** | 新文档：5 个决策点（支付通道/档位定价/订阅vs买断/书系锁vs免费/物料清单）+ 每个都有小驭倾向性建议；末尾「一键交接」段落——老罗回复一句话即可推进 B5 二期实施 |

### 四、增长审查

- **品牌一致性 ✅**：5 本 PDF 封面统一，与站点 deep 主题 + 品牌徽章语言同步；分布式书系有统一视觉锤
- **转化路径 ✅**：周报加「行动清单」修复合计 → 浏览 → 行动 → 复访的转化缺口（4 条具体动作可用）
- **决策就绪 ✅**：B5 二期拍板清单已写，老罗回来即可一键推进

### 五、验证与同步

- 封面视觉：Playwright 截图 + 5 PDF md5 一致
- deploy 镜像：5 PDF + ZIP md5 一致；周报 + 书库页 + sitemap + rss diff 一致
- 备份 `_archive/bline-20260902/`（追加共享封面模块 + 验证截图）
- git：仅提交 B 线自有文件（lib-book-cover.mjs + 3 脚本改动 + 周报 + 决策清单 + 验证脚本）；并发会话的其他 M 暂不动

### 六、待办队列

1. **B5 二期**（等老罗拍板）：支付通道 + 定价 + 物料 → 落地收银台
2. **B3 六期（可选）**：双语 EPUB 导出（英文版）；增量包按主题分包（"AI 工具包"/"AI 安全包"等）
3. **周报行动清单模板化**：gen-daily.mjs 排版时同步加，让未来周报都自动有行动清单
4. **环境注意**：并发会话持续重构；B 线改动后立即 prepare-deploy 同步

*本文档 append-only，每日运行追加新段落。*

---

## 2026-09-02 · C5 平台化收尾（C 线）：学习数据备份恢复 + 首页进度钩子（产品通监管）

### 一、产品审查结论

- **P3（跨设备证书丢失）**：本机凭证是真实痛点——证书/进度/成绩全部锁在 localStorage，换设备即清零。评估结论：**云同步需后端，纯静态现状不可行**；手动 JSON 导出/导入是最小可行解，先解决「数据是你的、可以带走」。
- **P5（首页缺进度钩子）**：首页学院入口卡只有静态介绍文案，回访用户无「我的进度」感知，转化缺钩子。实现：module.js 注入（已学 X/34 章 · 证书 N 张 · 实验 N 个 · 连续 N 天）。
- 隐私红线：备份**不含 AI 助教对话历史**（对话含个人提问，扩大泄露面），仅导统计。

### 二、C5 交付

| 交付 | 说明 |
|---|---|
| **证书页「备份与恢复」区块** | 一键导出 JSON（certs/progress/quiz/姓名/助教统计，文件名 ccowork-learning-backup-YYYYMMDD.json）；导入合并恢复（对象深合并不丢本地，1+2→3 实测）；错误防御（>2MB / 非法 JSON / 缺 data 拒绝 + aria-live 中文提示）；导入后「我的认证」自动刷新 |
| **module.js v25** | 首页学院入口注入「我的进度」迷你展示（#homeAcadProg，无进度显示引导文案，诚实不造数） |
| **scripts/verify-c5.mjs** | Playwright **19/19 全绿**：导出下载/内容校验/隐私排除/导入恢复/合并语义/错误拒绝/首页钩子（有/无进度两态）/deep 主题/零 JS 错误 |

### 三、真 bug 修复（Playwright 抓出）

1. **collect() 崩溃**：对裸字符串 key（`ccowork.learnerName`）`JSON.parse` 抛异常 → 导出为 null → 导入丢姓名。修复：解析失败回退原始字符串。
2. **renderMine 闭包缓存**：导入写入 localStorage 后 UI 不刷新（`certs` 是 IIFE 顶部缓存的闭包变量）。修复：renderMine 每次重读 localStorage。
3. 附带：裸字符串导入时二次 JSON.stringify 会改变存储格式（`"罗旭春"` vs `罗旭春`）→ 字符串分支按原始格式恢复。

### 四、文档与备份

- PRD v0.5（C5 设计 D17-D22 + 验收 19 项 + 发现表 P3/P5 ✅ + 路线图 Now/Next/Later 重排）
- 备份 `_archive/c5-backup-20260902/`（证书页 + module.js + PRD + site-progress）
- 部署镜像同步 + 线上链接复用 cd4b0031dbe041d1b32f15cbab005a04

### 五、待办队列（TaskCreate）

- **C5-1** 证书页备份恢复区块 ✅ 完成（2026-09-02）
- **C5-2** verify-c5.mjs 19/19 ✅ 完成
- **C5-3** PRD v0.5 + 部署 ✅ 完成（见下）
- **Next**：助教真实 API 评测 / lab 仿真挑战题 / 证书云查验 + 云同步评估 / 题库扩充 130 题（P1）
- **Later**：移动端体验 / 无障碍审计 / 蒙特卡洛固定种子（P9）/ 助教章节跳转建议 / 旧 quiz.html 处置（P2）

### 补记（同日第二次运行 · C5 备份恢复验证 + 线上巡检）

**C5 备份与恢复功能通过端到端验证 19/19**（产品代码 `35189e9` + 首页进度 `941173d`）：
- 诊断性复现定位：3 个初始失败（导出文件名/tutor.meta/姓名恢复）**全部是验证脚本时序 bug**（Chromium download 事件后 `suggestedFilename()` 过早读取返回内部 UUID 而非建议文件名），产品代码导出/导入/合并/隐私逻辑经实测全部正确
- 修复：verify-c5.mjs 等待 200ms 让浏览器解析下载元数据后再取文件名 → 重跑 **19/19 全绿**
- 实测确认：learnerName 裸字符串正确导出/恢复（无双重序列化）；tutor.meta 恒定写入；对话历史不导出（隐私设计验证通过）；导入后 tutor.history 清空属预期（隐私数据留原设备，仅合并统计）

**线上巡检（CloudStudio）**：书库页/认证页 200 正常，但 **ccowork-book-pack.zip 404**——线上为旧发布，最新增量（ZIP/备份恢复/首页进度）尚未上线。deploy 本地镜像已更新至 **213.3MB** 含全部新功能，待站点发布链路（内容流水线 deploy 或老罗指令）触发后生效。

*本文档 append-only，每日运行追加新段落。*

### 补记 2（同日第三次运行 · 封面 PDF 入库 + 一致性防线）

- **5 本 PDF 品牌封面统一版入库**（`feat(B3): ...封面统一`）：`5f39812` 只提交了封面脚本（lib-book-cover.mjs），PDF 二进制补提交（+~300KB/本，mtime 稳定）；deploy 镜像同步 213.3MB
- **架构防线复检**：抽查 5 个关键页 deploy 与源码 **0 diff**、学院 34 章页面源码/镜像全同步——gen-seo 类破坏防线稳固（deploy 镜像天然作对照基线）
- **PRD v0.5**（C5 数据可迁移 ✅）：产品通会话刚更新，未抢提交（并发活跃文档留给对应会话）
- 线上 ZIP 仍 404：待发布链路触发后复测（TaskCreate #2 挂起中）

*本文档 append-only，每日运行追加新段落。*

## 2026-09-02 · B 线（内容增长运营）· 爆款炼金师监管 · 第六次运行

### 一、周报行动清单模板化（gen-weekly.mjs 改造）

| 项 | 结果 |
|---|---|
| **LLM 输出 schema 扩展** | sys 增加 `actions:["行动1","行动2","行动3","行动4"]` 字段要求；prompt 新增第 9 条「**actions 必填 4 条**（30 字内，含具体动作动词 + 落地场景）」 |
| **HTML 模板渲染** | buildHTML 增加 actions 参数，渲染成与手动版一致位置的「下周一分钟行动清单」段（body 后、本周新闻源前、prevnext 前） |
| **周报 desc/keywords 重构** | 改为基于 news.js 真实数据拼接（去重前 4 条新闻标题为锚点，关键词从模型名自动提取）——**杜绝 LLM 幻觉污染 SEO** |
| **prompt 真实性铁律** | 新增第 7.1 条「**严禁放大/缩小数字**（模型名/参数/同比数据 1:1 一致；违反 = 整篇作废）」，用具体反例钉死（Llama 3.2 1B/3B 禁止升 Llama 4 / 1.2 万亿；IDC 128.3% 禁止说"翻倍"） |
| **意外副作用** | 一次 import() 语法测试触发了 main() 跑 LLM（顶层 `main().catch()` 自动执行），意外生成 9月第1周新周报——验证了改造后脚本全链路可用；周报已含 actions + desc 真实数据，无 LLM 幻觉 |

### 二、8月第5周周报 LLM 幻觉修复

| 项 | 结果 |
|---|---|
| **发现问题** | LLM 在 8月第5周 blockquote 总览中把 "Llama 3.2 1B/3B" 误写为 "Llama 4 / 1.2 万亿参数"、"IDC 128.3%" 误写为 "推理算力翻倍"（**违反"不编造数据"红线**） |
| **人工修复** | 直接修正 description "GPT-5o 发布、Llama 3.2 端侧小模型开源、豆包 4.5 长上下文 1000 万 token、IDC 生成式 AI 服务同比增 128.3%..." + 同步修正 keywords（Llama 4 → Llama 3.2 + 增 IDC） |
| **根因** | description 来自 gen-seo 从 body blockquote 提取，而 blockquote 由 weekly LLM 生成（受幻觉影响） |
| **永久修复** | gen-weekly.mjs 改为 desc/keywords 直接从 news.js 真实数据拼接，不经 LLM —— **未来周报 SEO 元数据 0 幻觉** |

### 三、9月第1周新周报自动化生成

- `blog/2026-09-02-本周AI大事记-2026年9月第1周.html` 由改造后的 weekly 自动生成：12 条 news / 4 h2 章节 / actions 段在位 / desc 真实数据
- 一处小瑕疵：IDC 同时有 2 条（工具市场 + 公有云），描述里出现重复——已加去重（按前 24 字符），下次跑修复

### 四、验证与同步

- gen-seo：sitemap 266 URL（↑1） / rss 40 篇（↑1）；首页 JSON-LD 增量
- prepare-deploy：两篇周报（8月第5周 + 9月第1周）镜像 diff 一致
- 备份 `_archive/bline-20260902/`（追加 gen-weekly.mjs 改造）
- git：仅提交 B 线自有（gen-weekly.mjs + 8月第5周周报修正 + site-progress）

### 五、待办队列

1. **B5 二期**（等老罗拍板）：决策清单已发 docs/monetization-decision.md
2. **B3 六期（可选）**：双语 EPUB + 主题分包
3. **周报去重逻辑已加**：下次 weekly 跑自动生效
4. **环境注意**：`main().catch()` 顶层调用导致 import() 会触发副作用，**已记录**（勿再用 import() 做语法测试，node --check 即可）

*本文档 append-only，每日运行追加新段落。*

---

## 2026-09-03（A 线巡检 · 安全加固 + 章节计数系统性 bug 根治）

> 执行：A 线工程地基（架构通监管）｜ 站点：ccowork-site/AI创作纪元 ｜ 基线：`0e4cbe6`

### 一、A 线状态确认

A1–A7 全部闭环（基线 `ece812d` → A6+A7 `4343fd3`）。本日为闭环后例行巡检，无新 A 任务可认领。重点：安全加固 + 消除反复出现的章节计数 bug。

### 二、🔴 安全事件：_gh_cred.txt 明文 GitHub PAT 未被 gitignore

| 项 | 详情 |
|---|---|
| **发现** | `_gh_cred.txt`（根目录）含明文 GitHub Personal Access Token（`gho_...`），未被 .gitignore 覆盖，处于 untracked 但未忽略状态 |
| **风险评估** | 虽然从未被 `git add` 提交入库（git ls-files 验证 0 命中），但存在于工作目录中，若误操作 `git add -A` 极易泄露 |
| **修复** | `.gitignore` 新增 `_gh_cred.txt`、`_gh_push.log`、`.edgeone/`、`/*.zip`（根目录备份压缩包） |
| **建议** | ⚠️ **建议老罗轮换该 GitHub token**（`gho_...`，虽未入库但磁盘明文存在，安全起见应视为已暴露） |

### 三、Bug 修复：章节计数系统性问题根治

**背景**：`TOTAL_CHAPTERS` 章节数不同步是反复出现的 bug 模式：
- 09-02：33→34（修复一次）
- 今日：gen-academy 新增第 35/36 章，但 `TOTAL_CHAPTERS` 仅从 34→35（少改一次）
- 更严重：module.js 第 574 行另有独立硬编码 `var totalChapters = 30`（C2 打卡卡片 UI 分母），从未被同步过

**根因**：同一文件内两处独立硬编码章节数，每次新增章节需手动改两处，必有一处遗漏。

**修复**：

| 位置 | 修复前 | 修复后 |
|---|---|---|
| module.js:427 `TOTAL_CHAPTERS` | 35 | **36** |
| module.js:574 `totalChapters` | 硬编码 `30` | `TOTAL_CHAPTERS`（引用常量） |

**效果**：打卡卡片进度分母从单一真源 `TOTAL_CHAPTERS` 派生，未来新增章节只需改一处。

**验证**：
- `node --check module.js` ✅ 语法通过
- `scripts/test-search.mjs` ✅ 15/15 全绿（零回归）
- `Select-String` 确认 module.js 内所有 `totalChapters` 引用均追溯到 `TOTAL_CHAPTERS`
- `ai-academy.html` / `ai-academy-roadmap.html` 已通过 `API.TOTAL_CHAPTERS` 动态引用（无需改）

### 四、内容增量审查与提交

工作区积压 14 个改动文件 + 8 个未跟踪文件，分 3 个提交归类入库：

| 提交 | 类型 | 内容 |
|---|---|---|
| `bb4eeea` | fix(A) | gitignore 加固（_gh_cred.txt/zip/.edgeone）+ module.js TOTAL_CHAPTERS 35→36 |
| `8c32a23` | feat(content) | 新博文 3 篇 + 学院 ch35/36 + 数据更新 + _gh_rest_push.py 工具脚本 |
| `8b36e3b` | fix(module) | 打卡卡片 totalChapters 硬编码 30→引用 TOTAL_CHAPTERS 单一真源 |

**内容审查结论**：
- 新博文 3 篇：讯飞星火 X2.5 端侧 100 万上下文 / OpenAI Astra 反超 GPT-4o / AI 创业生存指南——标题钩子合格（数字反差 + 否定式悬念），有 AI 生成标签 ✅
- 学院 ch35：DeepSeek-V4-Flash-Vision-Exp 多模态部署（MIT 开源 305B 权重）✅
- 学院 ch36：微软 Orchard Agent 训练基础设施（K8s 沙箱 + 三域 recipe）✅
- `scripts/_gh_rest_push.py`：GitHub REST 推送工具，令牌走 argv 不入库 ✅

### 五、安全扫描

| 扫描 | 范围 | 结果 |
|---|---|---|
| API Key 正则扫描 | 全部 .js 文件（sk-/gho_/ghp_ 模式） | ✅ 0 命中 |
| 脚本密钥扫描 | scripts/*.mjs（DEEPSEEK_API/ARK_API/ZHIPU_API） | ✅ 0 命中 |
| git tracked secrets | `git ls-files -- .env _gh_cred.txt *.key *.pem` | ✅ 0 命中（无密钥入库） |

### 六、架构审查（架构师视角）

| 维度 | 评估 | 说明 |
|---|---|---|
| **可扩展性** | ✅ 优秀 | 新增章节自动获得打卡/搜索/助教/统计能力（注入式零页面改动）；TOTAL_CHAPTERS 单一真源后消除同步遗漏 |
| **单一职责** | ⚠️ 关注 | module.js 635 行 / 38KB，承载 8+ 注入模块（导航/搜索/设置/打卡/统计/助教/CTA/主题）。各模块 try-catch 隔离良好，但文件持续增长。search.js/stats.js/ai-tutor.js 已拆出，建议后续将打卡模块也拆为独立文件 |
| **DRY** | ✅ 本次改善 | 消除 `totalChapters` 与 `TOTAL_CHAPTERS` 的重复硬编码；学院页面已通过 API 动态引用 |
| **性能** | ✅ 良好 | 搜索索引懒加载（234KB 首次打开才加载）；统计内存优先 60s 批量落盘；助教按需注入 |
| **安全** | ✅ 本次改善 | _gh_cred.txt 已 gitignore；全站 .js 密钥扫描 0 命中；Docker 非 root 运行；密钥仅服务端持有 |
| **向后兼容** | ✅ | `API.TOTAL_CHAPTERS` 暴露给页面，旧调用不受影响；stats.js 双模式降级保持 |

### 七、A 线总览（终态维护）

| 任务 | 状态 | 提交链 |
|---|---|---|
| A1 git 版本控制 | ✅ | `ece812d` |
| A2 目录治理 | ✅ | `ece812d` → `bb4eeea`（加固） |
| A3 全站搜索 | ✅ | `c4867f5` |
| A4 导航单一真源 | ✅ | — |
| A5 对话会话持久化 | ✅ | `d583611` |
| A6 统计埋点 | ✅ | `4343fd3` |
| A7 部署上线 | ✅ 工程准备 | `4343fd3`（待老罗选平台） |

### 八、新待办队列

1. **🔴 安全**：建议老罗轮换 GitHub token（`_gh_cred.txt` 中的 `gho_...`，虽未入库但磁盘明文存在）
2. **module.js 拆分**（中优先级）：打卡模块（C2）可拆为 `module-checkin.js` 按需加载，与 search/stats/tutor 模式一致
3. **ai-academy.html meta 标签**（低优先级，B 线）："36 章" 在 4 处 meta 中硬编码，建议 gen-seo.mjs 自动计算并注入
4. **gen-viral.mjs 表格转 HTML**（遗留）：生成的 markdown 表格塞进 `<p>` 导致前端不渲染，需改输出 HTML table
5. **A7 实际部署**：老罗选定支持 Node 的云平台后，用 `verify-deploy.mjs` 做上线验收

### 2026-09-03（A 线巡检 · 搜索索引过期修复 + deploy 镜像滞后处置）

**巡检结论**：工作区 git 干净（0 未提交）；A 线 A1–A7 维持闭环；TaskCreate 清单为空。

**🔴 发现并修复 1：全站搜索索引过期 4 天**
- 症状：`data/search-index.js` 停留在 08-30（228 页），8/31–9/2 新增内容全部漏索引（学院 33–36 章、9 月博文 ×4、周报 9月第1周等）
- 修复：`node scripts/gen-search-index.mjs` 重建 → **228→263 页**（+35），生成器自检通过（URL 有效/无重复/标题齐全）
- 验证：幂等复检（重跑仅 header 日期行变）；A3 搜索回归 15/15 全绿；deploy 镜像索引 diff 0
- 提交：`f03b808 fix(A3): 重建全站搜索索引 228→263 页`

**🟠 发现并修复 2：deploy 镜像滞后源码 1 版本**
- 症状：`deploy/module.js` 仍为 TOTAL_CHAPTERS=35 + 硬编码 30（bb4eeea 提交后未同步）
- 修复：重跑 `prepare-deploy.mjs` → 305.6MB，密钥注入断言通过，关键文件 diff 0
- 复盘：每次涉及 module.js/index.html 等核心文件的提交后应同步 deploy，防「线上发布打回旧版」——已纳入巡检 SOP

**架构审查**：module.js 打卡 totalChapters 已引用全局单一真源（HEAD `8b36e3b`）；JS 语法全绿；源码密钥扫描 0 命中（密钥仅注入 deploy 副本 + .env）

**遗留观察**：`docs/site-progress.md` 有并发会话在写（append-only 段在结尾行前收敛，无实质 diff 冲突）

### 2026-09-03（补 · 全站审计工具 4 缺陷修复 + 学院 35/36 死链）

**背景**：UI 回归全绿后跑全站审计（audit-site.mjs），意外发现**审计工具自身 4 个缺陷**（均修复，`6b8d40b`）：

| # | 缺陷 | 影响 | 修复 |
|---|---|---|---|
| 1 | JSON-LD 数据块被当 JS 检查 | B1 SEO v2 后全站 200+ 页 JSON-LD 全误报 JS 错误 | 按 script type 过滤（仅 javascript/module） |
| 2 | 每 JS 块 spawn `node --check` | 278 页 × 数十块 = 数千进程，2 分钟跑不完 | `vm.Script` 内存编译，**1m40s → 0.65s（~185×）** |
| 3 | walk 未排除 deploy/_internal/templates | 生成物重复审计（站点页翻倍、内容库 550 页虚高） | 与 check-links 排除名单对齐 |
| 4 | 死链/坏图/可达性未 decodeURIComponent | book 中文文件名链接 18 条**假死链**误报 | 安全解码 + 孤立 `%` 容错 |

**连带发现并修复**：学院 chapter-35/36 学院回链 `../website/ai-academy.html` → `../../website/ai-academy.html`（与 01-34 章一致；35/36 生成时少一级 `../` 的真死链 ×2）

**修复后全站审计结果（全绿）**：JS 错误 0 · 死链 0 · 坏图 0；170 站点页 161 可达（9 孤儿 = JS 导航/并入总站跳转/语料检索页，非死链）；内容库 101 页（修正重复统计后）

**新发现挂账**：gen-academy.mjs 第 212 行模板学院回链写死 `../website/ai-academy.html`——35/36 章路径 bug 疑似根源（模板与输出目录推断需理解后修），归 B 线生成器维护

**验证**：node --check 语法 OK；deploy 镜像已同步（章节 diff 0）

### 2026-09-03（补 2 · 僵尸脚本清理 + ecosystem 测试复活）

**🔍 全仓扫 D 盘硬编码**（A2 单一真源持续治理）：scripts/ 下 2 个文件命中旧路径

1. **test-ecosystem.mjs 修复**（`863e450`）：3 处 `D:/新建文件夹/AI创作纪元/` → 基于脚本位置推导 ROOT；补 mock 缺口（外链 videokit.js 真实加载 + documentMock.addEventListener）。**从永久不可运行 → 可用回归**：✅ ecosystem.html 主脚本 0 运行时错误 · 模块卡片真实渲染 47 个
2. **僵尸脚本删除 inject-widget.mjs**（`bbc666c`）：D 盘硬编码 + 全仓零引用 + 基线后零维护；功能（注入 ccowork.js+baiju-widget.js）被 inject-ccowork.mjs 完全覆盖 → git rm（历史可追溯）

**经验固化**：站点迁移后曾有一批 D 盘路径脚本，分批清理——今日清掉最后 2 个；`scripts/` 现役脚本路径写法应统一 `fileURLToPath(new URL('..', import.meta.url))` 相对推导

---

## 2026-09-03（B 线 · 内容增长运营：B1 SEO 补漏 + B5 最小实现落地）

> 工作线：B1–B5 内容增长运营（爆款炼金师监管 · B 线）
> 当日目标：内容质量审查 + 推进 B 任务 + SEO/传播审查 + 工作报告

---

### 一、内容质量审查（当日/近期博客 + 学院页）

**审查范围**：9月3日新发布博客 2 篇 + 本周大事记 1 篇 + 近期爆款博文 5 篇 + AI 实战全书书页

| 页面 | 标题钩子 | 开篇痛点 | 结构/数据锚点 | 问题标记 |
|---|---|---|---|---|
| 2026-09-03 讯飞星火X2.5 | ✅ 数字+反差（100万 vs 4B） | ✅ "受够了云端大模型的气" | ✅ 参数对比表 | ⚠️ 标题"干翻"属夸张词，广告法需注意；SVG 封面标题截断 |
| 2026-09-03 OpenAI Astra | ✅ 疑问+数字（3个能力） | ✅ "多轮对话卡顿、长文档漏信息" | ✅ 场景化分点 | ⚠️ 标题"反超"属绝对化用语风险；SVG 封面标题截断 |
| 2026-09-02 本周AI大事记 | ✅ 时间锚定 | ✅ 热点聚合 | ✅ 12条新闻清单 | ✅ 无问题 |
| 2026-09-01 Agent协作实测 | ✅ 数字+对比（30天记忆） | ✅ "聊半小时就忘前情" | ✅ 实测场景 | ✅ 无问题 |
| AI 实战全书 | ✅ 副标题人群定位 | ✅ "你不需要会编程" | ✅ 章节目录清晰 | — 本次追加会员预告条 |

**爆款化优化建议（小步改进，不动骨架）**：
1. 两篇 9/3 标题保留传播力，但在正文首段增加"免责声明"密度（已含"以官方为准"，足够）
2. SVG 封面标题截断是模板已知限制（长标题超 42px 字号下的 SVG 宽度），不阻塞内容质量
3. 本周大事记 meta description 有格式瑕疵（`">">` 重复引号），已由 gen-seo.mjs 自动修复

---

### 二、B 任务推进

#### B1 SEO 基础 ✅（补漏完成）
- **执行**：`node scripts/gen-seo.mjs`（非 dry）
- **结果**：
  - 补 description：8 页（含 9/3 新博客 2 页 + 9/3 新学院页 2 页 + 其他 4 页）
  - 补 keywords：6 页
  - 补 canonical/og/twitter/json-ld：6 页
  - sitemap.xml：271 条 URL（已更新）
  - rss.xml：43 篇博文（已更新）
  - robots.txt：已生成
- **状态**：B1 视为维护态完成；后续新页由 gen-seo.mjs 自动覆盖

#### B2 内容日历自动化 ✅（已就绪，持续运转）
- 管线脚本 `gen-daily.mjs` / `gen-viral.mjs` 正常
- 9/3 新内容已按日历落位（06:40 seed → 08:00 blog → 08:36 发布）
- **状态**：持续运转，无需人工干预

#### B3 书系资产化 ⏳（部分完成，持续推进）
- 当前可分发：《AI 实战全书》单本已打样（monetization-plan.md 确认）
- `gen-book-epub*.py` / `gen-book-pdf*.mjs` 脚本就绪
- 待执行：五卷全书等其余书系导出（排期依赖内容生成节奏）

#### B4 访问统计与热榜 ✅（已落地）
- `stats.js` 本地轻量统计运行正常
- 首页 `#hot` + `#ccoworkHot` 热榜模块已接入，样式完整
- 当前为 localStorage 降级模式（纯静态托管预期行为）
- **状态**：已落地；若日后接入 Node 后端，加 `<meta name="ccowork-stats" content="server">` 即可切换

#### B5 变现规划 ✅（最小实现落地）
- **执行**：在 `blog/AI实战全书.html` 末尾插入「📚 书系会员计划预告」区块
- **文案原则**：
  - 无购买按钮、无假功能、不诱导
  - 明确"正在筹备"、"免费内容永远开放"
  - 说明会员权益（EPUB/PDF 全量下载 + 每周干货周报）
- **合规自检**：
  - 无「最/第一/绝对」等广告法禁用词 ✅
  - 无诱导分享/付费墙 ✅
  - 无支付按钮（未接通道前不显示购买）✅
- **状态**：B5 一期（意愿预告）落地；二期（支付通道 + 会员体系）待老罗拍板通道后执行

---

### 三、内容增长视角审查

| 维度 | 审查项 | 结果 |
|---|---|---|
| 选题热度 | 9/3 讯飞星火X2.5（本地长上下文）+ OpenAI Astra（新模型）均踩当日热点 | ✅ 热点响应及时 |
| SEO 关键词 | title/description 已覆盖"讯飞开源星火X2.5"/"OpenAI Astra"/"本地跑"/"零成本"等目标词 | ✅ gen-seo 已补全 |
| 可传播性 | 两篇均有「对比表」可截图锚点；有具体数字（100万/4B/3个能力）；有场景化痛点 | ✅ 传播要素齐备 |
| 长文 CTA | AI 实战全书末尾已加会员预告（软引导）；其余长文暂无硬转化点，保持阅读体验优先 | 🟡 可逐步加强 |

---

### 四、下一步（B 线）

1. **B3 推进**：择日执行 `gen-book-epub3.py` 导出五卷全书 EPUB（内容增长视角：可分发资产增加 → 会员制内容基础增厚）
2. **B5 二期**：老罗拍板支付通道（微信支付 / 爱发电 / 其他）后，落地会员体系页面 + 档位说明
3. **日常维护**：每周重跑 `gen-seo.mjs`（若当周有新页）；每日审查新发布内容标题与 meta 质量
4. **A 线协同**：B 线内容审查发现的 gen-academy.mjs 模板回链 bug（35/36 章）已挂账，待 A 线修复

*本文档 append-only，每日运行追加新段落。*

---

### 2026-09-03 B 线第七次运行 · 内容质量审查（双 SVG 与管道表格双根因修复）

> 调度：B 线每日例行（爆款炼金师 ViralTopicMaster 专家监管）
> 触发：审查 09-03 新增 2 篇爆款博客 + 历史 09-01 一篇；统一修复后再上线

#### 一、内容质量审查（爆款炼金师方法论）

| 文章 | 选题热度 | 开篇钩子 | 截图锚点 | 转化点 | 整体评分 |
|---|---|---|---|---|---|
| X2.5 讯飞星火 | 🔥 4B+100万长上下文踩中端侧趋势 | 4 连痛点（传 PDF 拆 8 段/敏感不敢传/排队 10 分钟/月账单肉疼） | ⚠️ 仅散文化对比，无视觉锚 | 行动清单 ✅ | 修复后 ↑ |
| Astra 突袭 | 🔥 GPT-4o 反超叙事+零成本 | 突袭节奏感强 + 3 类人不着急升级 | ⚠️ 5 行参数散落正文 | 行动清单 ✅ | 修复后 ↑ |

#### 二、本次发现 + 修复（根因级，非补丁）

**Bug A · opt-blog.py 头图守卫失效导致双头图系统性复发**
- 症状：09-03 两篇新博客出现重复 `<svg viewBox="0 0 1200 240">` 封面（旧「深度长文」版 + 新「🔥 爆款生产线」版叠加）
- 根因：opt-blog.py 第 52 行守卫正则 `<article[^>]*>\s*<svg 1200x240` 只匹配紧跟 `<article>` 的 SVG，但 gen-viral.mjs 模板序为 `<article> → <h1> → <svg>`，h1 挡道 → 守卫永远匹配不上 → 每次新爆款文章都重复注入旧头图
- 更严重：仿真证明旧守卫对 09-01 已修复页面也返回 False，下次 opt-blog 全量跑会再次复炸（定时炸弹）
- 修复：守卫正则改为 `r'<article[^>]*>[\s\S]*?<svg viewBox="0 0 1200 240"'`，扫描 article 块内任意位置
- 验证：全站双头图 0；3 篇 09-03/09-01 文章 svg=1 ✅

**Bug B · gen-viral.mjs 渲染器不支持 GFM 管道表格 → 读者直接看 Markdown 符号**
- 症状：3 篇爆款博客的「参数对比表」实际渲染为 `<p>| 模型类型 | 参数规模 | ... |</p>` 散文块，读者看到原始管道字符（site-progress 之前声称的「对比表截图锚点」实为错觉）
- 根因：`mdToHtml` 函数无表格分支，管道行直接落 `<p>` 兜底
- 修复：mdToHtml 重写为索引循环版，新增表格检测（`|...|` + 下行 `|---|` 分隔）+ 内联 styled `<table>`（金色表头+青色首列+圆角卡片，沿用双主题 token）
- 单元测试（不 import 执行型模块，仅函数提取求值）：表格 5/3 列、strong/code/inline 保留、无管道残留 ✅

**Bug C · fix-md-tables.py 管道剥除 bug（自找的二次 bug）**
- 症状：首轮转换后 X2.5 表头列数 6（多一个幽灵空列）
- 根因：parse_row 写错 `s = s[1:] if s.endswith('|') else s[1:]`（恒只去头不去尾）
- 修复：改为显式剥首/剥尾

#### 三、存量修复（3 篇博文）

| 文章 | 修复动作 | 表格列数 | 数据校验 |
|---|---|---|---|
| 2026-09-03 X2.5 | git checkout → fix-dup-svg → fix-md-tables → gen-seo 重跑 | 5 列 | 70B+/128K-200K/云端A100集群/0.01-0.05元/1000K/2.5G以上内存/本地0成本 全保留 ✅ |
| 2026-09-03 Astra | 同上 | 3 列 | 200-300ms/80-120ms/4M/99.2%/78%/92% 全保留 ✅ |
| 2026-09-01 Agent 协作 | 同上 | 2 表 | 同上 ✅ |

干净重放链路：`git checkout -- 3 篇 → fix-dup-svg.mjs → fix-md-tables.py（修正后）→ gen-seo.mjs`，每次执行后 svg=1 / table=N / 管道 0 / JS 错误 0。

#### 四、生成器单元验证（gen-viral.mjs 函数文本独立求值，非 import 触发 main）

```
输入: | 模型类型 | 参数规模 | 典型上下文 |
      |---|---|---|
      | 云端旗舰 | 70B+ | 128K-200K |
      | 星火X2.5 | **4B** | 100万 |

输出: <table>...<thead>模型类型/参数规模/典型上下文</thead>
      <tbody><tr><td>云端旗舰</td><td>70B+</td><td>128K-200K</td></tr>
      <tr><td>星火X2.5</td><td><strong>4B</strong></td><td>100万</td></tr></tbody>
      strong/code/inline 链接全保留，无管道残留
```

#### 五、Playwright HTTP 复核（http://127.0.0.1:8791，3 篇全绿）

```
PASS 2026-09-03-爆款-100万上下文塞进4B小   svg=1 table=1 pipe=0 jsErr=0
PASS 2026-09-03-爆款-3个新能力反超GPT-4   svg=1 table=1 pipe=0 jsErr=0
PASS 2026-09-01-爆款-3个Agent协作开源A     svg=1 table=2 pipe=0 jsErr=0
ALL GREEN
```

视觉验证：表格金色表头 + 青色首列对比 + 圆角卡片，截图存 `_archive/bline-20260903/table-x25-v2.png` 与 `table-astra.png`。

#### 六、内容增长视角审查

| 维度 | 审查项 | 结果 |
|---|---|---|
| 选题热度 | 09-03 两篇均踩当日热点（讯飞 X2.5 + OpenAI Astra），独立可二次核 | ✅ |
| SEO 关键词 | gen-seo 自动从 title 拼接；描述钩子聚焦痛点不编造 | ✅ |
| 可传播性 | 本次升级 —— 表格已可截图（X2.5 对照云端/开源/星火三档，Astra 对照 GPT-4o 关键参数），是真正视觉锚点而非散文化 | ✅↑ |
| 来源对冲 | 3 篇均带「AI 生成整理/以官方为准」免责声明 + opt-blog 注入的「出处声明」 | ✅ |
| LLM 幻觉 | 9-03 两篇数据均带原文出处声明「来自科大讯飞官方开源公告/以OpenAI官方公开信息为准」，未硬编造具体厂商 URL | ✅ |
| 红线合规 | 标题含问号/夸张语但内容有 hedging（X2.5 在"实测不吹水"段承认 70B 云端在奥数题上仍更优，正确率~70%） | ✅ |

#### 七、归档与产物

- 备份：`scripts/opt-blog.py` + `scripts/gen-viral.mjs` → `_archive/bline-20260903/`
- 修复脚本：`scripts/fix-md-tables.py`（幂等）
- 体检脚本：`_internal/bline-check-0903.mjs`（file://） + `_internal/bline-check-http.mjs`（HTTP 零噪版）
- 截图：`_archive/bline-20260903/table-x25-v2.png` + `table-astra.png` + 3 篇全页截图

#### 八、site-progress 自我更正

昨日记录"两篇均有对比表可截图锚点"——经核实为错觉，实际是 Markdown 表格未渲染的散文化对比段。本次已修正并补上真正可截图的对比表。

#### 九、下一步（B 线）

1. 关注每日新增爆款博客是否真正使用了新的表格渲染器（明日监控 9-04 输出）
2. B5 二期：仍待老罗拍板支付通道（docs/monetization-decision.md 一句话交接）
3. B3 六期可选：双语 EPUB + 主题分包（不强求）
4. 周报 desc 去重：gen-weekly schema 改动下一次 weekly 产出（9-07）生效

*本文档 append-only，每日运行追加新段落。*
