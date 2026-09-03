# DESIGN.md · 导航栏与设置悬浮窗组件规范

> 白驹 ccowork · 全局设计系统（组件子规范）
> 版本：v1.0（2026-08-30）· 监管：DesignMdArchitect（Diana）
> 适用范围：全站 47+ 页面的导航栏（nav.top / 注入式导航）＋ 全局外观设置悬浮窗（#modSettings）＋ 吸顶目录条（#modTocBar）
> 关联文件：`module.js`（注入层）· `ccowork.js`（入口注入器）· `index.html`（门户导航骨架）· `theme-cloud.css`（双主题引擎）· `site-redesign.css`（组件层）· `site-industrial.css`（工业美学层）

---

## 1. 视觉主题与氛围（Visual Theme & Atmosphere）

- **设计哲学**：把散落的 AI 工具装进一个大脑——导航与设置组件是全站的「控制面」，视觉上须同时满足 **精密仪表（工业）** 与 **云霞渐变（人文）** 两种气质，毛玻璃分层、渐变主操作、胶囊化入口。
- **核心特征**：毛玻璃分层（blur 16px）/ 蓝青紫渐变（120deg）/ 胶囊与圆角混合体系 / 双主题平行（云顶=浅、深空=深）/ 组件样式一律走 `var()` token。
- **光影质感**：导航 = 半透明玻璃 + 1px 底边线 + 轻投影；悬浮面板 = 更实的玻璃（.92~.96 不透明度）+ 18px 圆角 + 大投影（70px 模糊）。

## 2. 调色板与 Token 映射（Color Palette & Roles）

### 2.1 双主题核心 Token（引擎层 · theme-cloud.css 已定义，组件一律引用）

| CSS 变量 | 云顶 cloud | 深空 deep | 使用场景 |
|---|---|---|---|
| `--bg` | `#F4F7FC` | `#030014` | 页面底色 |
| `--card` | `#ffffff` | `#101728` | 卡片 / 面板底 |
| `--panel` | `rgba(255,255,255,.72)` | `rgba(13,19,32,.62)` | 玻璃面板底 |
| `--line` | `rgba(90,140,190,.3)` | `rgba(120,160,220,.16)` | 描边 / 分隔线 |
| `--text` | `#1e293b` | `#e9f0fb` | 主文字 |
| `--muted` | `#475569` | `#8fa3bd` | 次级文字 |
| `--blue` | `#2563eb` | `#5b8cff` | 主交互色（链接 / hover） |
| `--cyan` | `#0891b2` | `#38e1ff` | 深色强调 / 激活辅助色 |
| `--gold` | `#b45309` | `#f0b95c` | 强调 / 警示 |
| `--grad` | `linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6)` | `linear-gradient(120deg,#38e1ff,#5b8cff 45%,#8b5cf6)` | 主渐变（激活态 / 主按钮 / Logo） |
| `--nav-bg` | `rgba(255,255,255,.82)` | `rgba(8,5,28,.70)` | **导航毛玻璃底**（index.html:24/37 补充定义） |
| `--nav-line` | `rgba(227,235,245,.95)` | `rgba(255,255,255,.08)` | 导航底边线 |
| `--nav-shadow` | `0 2px 16px rgba(31,45,77,.07)` | `0 2px 16px rgba(0,0,0,.35)` | 导航投影 |

### 2.2 组件专用 Token（规范新增建议，当前散落硬编码）

| 建议变量 | 云顶 | 深空 | 用途 |
|---|---|---|---|
| `--glass-strong` | `rgba(255,255,255,.96)` | `rgba(8,12,22,.95)` | 设置悬浮窗底（现硬编码于 module.js:52/56） |
| `--gear-bg` | `rgba(255,255,255,.85)` | `rgba(8,12,22,.9)` | 悬浮齿轮 / 返回顶部底 |
| `--float-shadow` | `0 24px 70px rgba(37,99,235,.18)` | `0 24px 70px rgba(0,0,0,.6)` | 浮层大投影 |
| `--chip-bg` | `rgba(120,160,220,.12)` | `rgba(120,160,220,.10)` | 胶囊标签底（导航 hover / 徽章） |

## 3. 排版规则（Typography）

| 层级 | 字号 | 字重 | 行高 | 场景 |
|---|---|---|---|---|
| 品牌名 | 17px | 900 | 1.2 | nav .brand，渐变字 |
| 导航链接 | 14px | 600 | 1.4 | .links a（组件层统一 13px padding） |
| 面板标题 | 15px | 900 | 1.3 | .s-head b，渐变字 |
| 面板标签 | 12.5px | 600 | 1.4 | .s-row > span |
| 面板控件 | 12px | 400/700 | 1.3 | seg 按钮 / select / option |
| 提示语 | 11px | 400 | 1.5 | .s-tip |
| TOC 标题 | 13px | 700 | 1.4 | .t-title |
| TOC 链接 | 12.5px / 11.5px(lv3) | 400 | 1.4 | .t-list a |

字体族统一：`var(--sans,"PingFang SC","Microsoft YaHei",system-ui,sans-serif)`；工业读数元素（SEC 序号 / 标签 / 表头）用 `ui-monospace,Consolas,Menlo,monospace`（site-industrial.css 已规范）。

## 4. 组件规范（Component Stylings）

### 4.1 导航栏 Navbar（`nav.top` / 注入式导航）

**结构骨架（index.html 为基准）：**

```html
<nav class="top">
  <div class="brand"><span class="logo">🐎</span><span class="nm">白驹 · ccowork</span></div>
  <button class="burger">☰</button>
  <div class="links" id="navlinks">
    <a href="#" class="cur">💬 对话</a>  <!-- 当前页 = .cur -->
    <a href="#">…</a>
  </div>
  <div class="nav-actions">
    <button class="theme-btn">🌙</button>
    <a class="cta" href="#">开始对话</a>
    <button id="modNavGear" class="nav-gear">⚙️</button> <!-- module.js 注入 -->
  </div>
</nav>
```

**状态矩阵：**

| 状态 | 样式 | Token |
|---|---|---|
| 默认底 | 毛玻璃 blur(16px) + 底边线 + 轻投影 | `var(--nav-bg)` / `var(--nav-line)` / `var(--nav-shadow)` |
| 链接 hover | 胶囊浅底 + 主色字 | `rgba(120,160,220,.12)` + `var(--blue)` |
| 链接激活（.cur/.active） | **渐变底白字** + 色晕 | `var(--grad)` + `#fff` + `0 4px 12px rgba(79,140,255,.30)` |
| 返回链接（.back） | 金色字 | `var(--gold)` |
| 品牌 Logo | 渐变字 900 字重 | `var(--grad)` clip-text |
| 主 CTA | 渐变胶囊 | `var(--grad)` + 白字 + 圆角 99px（桌面）/ 8px（工业层仅 .cta） |

**尺寸**：导航高 64px（桌面，index.html:54）/ 56px（≤640px）；`.nav-actions` 间距 10px；`.links` 链接 padding `9px 13px`（组件层统一 `8px 13px` 胶囊圆角 9px）。

**设置入口 `#modNavGear`（注入规范）：**

```html
<button id="modNavGear" class="nav-gear" type="button" title="外观设置" aria-label="外观设置">
  ⚙️
</button>
```

```css
.nav-gear{
  margin-left:8px; flex-shrink:0; cursor:pointer;
  width:34px; height:34px; border-radius:9px;
  border:1px solid var(--line);
  background:var(--chip-bg, rgba(120,160,220,.12));
  color:var(--muted); font-size:15px; line-height:1;
  display:inline-flex; align-items:center; justify-content:center;
  transition:color .18s, border-color .18s, transform .18s;
}
.nav-gear:hover{ color:var(--blue); border-color:var(--blue); transform:rotate(20deg); }
body[data-theme="deep"] .nav-gear:hover{ color:var(--cyan); border-color:var(--cyan); }
```

> **禁止**：JS `style.cssText` 内联注入外观属性（现 module.js:198 违反）——必须走类名 + 组件层 CSS，否则深色主题无适配、样式不可覆盖。

### 4.2 全局外观设置悬浮窗（`#modSettings`）

**结构：**

```html
<div id="modSettings" role="dialog" aria-modal="false" aria-labelledby="modSettingsTitle">
  <div class="s-head">
    <b id="modSettingsTitle">🎨 外观设置</b>
    <button class="s-close" type="button" title="关闭" aria-label="关闭设置">✕</button>
  </div>
  <div class="s-row"><span>主题</span>
    <div class="s-seg">
      <button type="button" data-theme-set="cloud" class="on">☁️ 云顶</button>
      <button type="button" data-theme-set="deep">🌌 深空</button>
    </div>
  </div>
  <div class="s-row"><span>壁纸</span><select id="modWall">…</select></div>
  <div class="s-row"><span>字体</span><select id="modFont">…</select></div>
  <div class="s-tip">全站生效 · 自动记忆</div>
</div>
```

**样式规格（规范版，token 化）：**

| 属性 | 云顶 | 深空 |
|---|---|---|
| 底 | `rgba(255,255,255,.96)` → `var(--glass-strong)` | `rgba(8,12,22,.95)` |
| 描边 | `1px solid rgba(90,140,190,.3)` | `1px solid rgba(120,160,220,.28)` |
| 投影 | `0 24px 70px rgba(37,99,235,.18)` | `0 24px 70px rgba(0,0,0,.6)` |
| 圆角 | 18px | 18px |
| 定位 | `right:16px; top:导航底部+8px`（placeBar 动态） | 同左 |
| 宽度 | `min(310px, calc(100vw - 32px))` | 同左 |
| 入场 | `translateY(-10px) scale(.97) → none`，`.26s` | 同左 |

**交互规则：**
1. 打开：`.show`（opacity 1 / pointer-events auto / transform none）
2. 关闭：`.s-close` 点击 / 面板外点击（现 module.js:181-185 ✓）/ **Esc 键（缺失，需补）**
3. 记忆：`ccowork.theme` / `ccowork.wall` / `ccowork.font`（**唯一真源**，ccowork.js 与 module.js 共用 ✓）
4. 主题联动壁纸：仅当用户未手动选壁纸时联动（cloud→cloud-hero，deep→epoch ✓）
5. 切换过渡：body.theme-fading 550ms 防闪变 ✓
6. 焦点管理（缺失，需补）：打开时焦点移入面板首控件；关闭时归还触发元素

### 4.3 吸顶目录条（`#modTocBar`）

| 属性 | 规格 |
|---|---|
| 触发 | `article/.content/main` 内 `h2,h3` ≥ 4 个（或全局 h2/h3 兜底） |
| 定位 | 固定于导航正下方（placeBar 读导航 rect.bottom，兜底 56px） |
| 结构 | `.t-title`（📑 页面名）+ `.t-list`（胶囊锚点）+ `.t-actions`（⚙️ × 关闭） |
| 滚动指示 | `.t-list` 横向滚动 + 双侧 mask 渐变；scroll-spy 用 IntersectionObserver，激活项 = 渐变底白字 |
| 记忆 | `ccowork.tocBarClosed`（关闭后本页隐藏） |
| 抑制 | `<body/main class="no-toc">` 或 URL `?no-toc` 不生成 ✓ |
| z-index | **99 → 建议 9990**（现过低，易被页面 fixed 元素遮挡） |

### 4.4 圆角体系（统一决策）

| 元素 | 圆角 |
|---|---|
| 导航链接胶囊 | 9px |
| 导航操作钮（theme-btn / nav-gear） | 9px（theme-btn 桌面保持 99px 胶囊，**工业层不得覆盖 theme-btn**） |
| 浮层内控件（seg / select） | 10px |
| 图标圆钮（modGear / modTop / t-btn / s-close） | 50% |
| 浮层面板 | 18px |

## 5. 布局原则（Layout）

- 间距基数 4px；浮层内行距 11px；面板 padding `16px 18px`；面板内控件间距 6px（seg gap）。
- 导航容器：`padding:0 24px`（桌面）/ `0 14px`（≤640px）；右侧操作区 `margin-left:auto`。
- 浮层定位规则：设置窗与 TOC 条共用 placeBar 定位；无 TOC 页面设置窗 `top:64px` 兜底（非 56px）。
- 深度层级（z-index）：`--z-bar:9990`（进度条/TOC条）`--z-float:9991`（齿轮/返回顶）`--z-panel:9995`（设置窗）`--z-widget:9998`（ccowork 面板）`--z-top:9999`（宠物/预览框）。

## 6. 无障碍要求（Accessibility）

1. 所有图标按钮须有 `title` + `aria-label`（齿轮/关闭/返回顶部）。
2. `#modSettings` 声明 `role="dialog"` + `aria-labelledby`（指向标题）。
3. **Esc 关闭**浮层与 TOC；关闭后焦点归还触发按钮。
4. 触屏设备最小可点区 44px（responsive.css `@media(pointer:coarse)` 已全局兜底 ✓，浮层内控件 12px 字号达标）。
5. 色彩对比：云顶 muted `#475569` on `#fff` ≈ 7.4:1 ✓；深空 muted `#8fa3bd` on `#101728` ✓。禁用纯色传达状态（渐变激活态同时以字重 700 佐证）。
6. 键盘可达：面板内控件均原生 `<button>/<select>` ✓；TOC 锚点为 `<a href="#id">` ✓（module.js 平滑滚动拦截时保留 href 可降级）。

## 7. 可复用组件片段（Copy-Ready）

### 7.1 导航栏（含设置入口）— 生产级

```html
<nav class="top">
  <div class="brand"><span class="logo">🐎</span><span class="nm">白驹 · ccowork</span></div>
  <button class="burger" type="button" aria-label="展开菜单">☰</button>
  <div class="links" id="navlinks">
    <a href="./website/workstation.html" class="cur">💻 工作站</a>
    <a href="./website/gallery.html">🎨 绘画</a>
    <a href="./website/ai-academy.html">🎓 AI 学院</a>
  </div>
  <div class="nav-actions">
    <button class="theme-btn" id="themeBtn" type="button" title="切换亮暗主题" aria-label="切换亮暗主题">🌙</button>
    <a class="cta" href="#chatbox">开始对话</a>
    <button class="nav-gear" id="modNavGear" type="button" title="外观设置" aria-label="外观设置">⚙️</button>
  </div>
</nav>
```

### 7.2 设置悬浮窗注入（module.js 规范改造示意）

```js
// 仅示意 token 化改造方向——本规范线不改动运行代码，由实现线按偏差清单执行
var SETTINGS_CSS =
  '#modSettings{position:fixed;right:16px;z-index:9995;width:min(310px,calc(100vw - 32px));' +
  'border-radius:18px;padding:16px 18px;' +
  'background:var(--glass-strong,rgba(255,255,255,.96));border:1px solid var(--line);' +
  'box-shadow:var(--float-shadow,0 24px 70px rgba(37,99,235,.18));' +
  'backdrop-filter:blur(18px);font-family:var(--sans);color:var(--text);' +
  'transform:translateY(-10px) scale(.97);opacity:0;pointer-events:none;transition:.26s}' +
  'body[data-theme="deep"] #modSettings{background:var(--glass-strong-deep,rgba(8,12,22,.95));}'
// + Esc 关闭 / role=dialog / aria-labelledby / 焦点管理（见第 6 节）
```

### 7.3 齿轮按钮（浮层入口统一）

```css
/* 悬浮齿轮与返回顶部：统一深色底 → token 化双主题 */
#modGear, #modTop{
  width:44px;height:44px;border-radius:50%;
  border:1px solid var(--line);background:var(--gear-bg);
  color:var(--muted);backdrop-filter:blur(8px);transition:.3s;
}
#modGear:hover{ color:var(--gold); border-color:var(--gold); transform:rotate(20deg); }
```

## 8. 偏差清单（现状 vs 规范 · 审查结论 2026-08-30）

> 结论：组件功能完整、双主题可见，但**主题存储双真源**与**内联硬编码样式**两项为高风险偏差。全部偏差**仅记录，本线不改代码**，转实现线按优先级处理。

| # | 级别 | 位置 | 偏差描述 | 规范要求 |
|---|---|---|---|---|
| B1 | 🔴 | index.html:1266-1279 与 module.js:97-117 | **主题双真源**：`themeBtn` 读写 `baiju-config-v2.c.deep`，module.js 读写 `ccowork.theme`，互不同步 → 悬浮窗切深色后刷新可能被 index 覆盖回云顶 | 统一以 `ccowork.theme/wall/font` 为唯一真源；index 侧迁移或写入桥接（写主题时同步两键） |
| B2 | 🔴 | module.js:18-76 | 注入样式大量硬编码色值（`rgba(255,255,255,.82)`、`rgba(8,12,22,.9)`、`#2563eb`、`#5eead4`、`#475569` 等），未走 var() token，破坏单一真源 | 组件样式全部引用 `var(--xxx)`，硬编码仅允许出现在 theme-cloud.css 引擎层 |
| B3 | 🔴 | module.js:50-51 | `#modGear`/`#modTop` 默认深色底 `rgba(8,12,22,.9)`，云顶浅色主题下为突兀深钮；无 `body[data-theme="cloud"]` 适配 | 底色走 `var(--gear-bg)` 双主题；hover 用 `var(--gold)` |
| B4 | 🟠 | module.js:198 | `#modNavGear` 用 `style.cssText` 内联（浅色底 `rgba(255,255,255,.6)`），深色主题下突兀；无类名，组件层无法覆盖 | 注入 `class="nav-gear"`，样式移入组件层，双主题适配 |
| B5 | 🟠 | module.js:236-242 | `placeBar` 兜底 `top:56` 与 index 导航高 64px 不符（长文页可能被遮 8px）；无 TOC 页设置窗 top 64px 兜底也硬编码 | 兜底改 64px；或统一读取导航 rect，无导航时 64px |
| B6 | 🟠 | module.js:52-76 | `#modSettings` 无 `max-height`/`overflow-y`、无 `role="dialog"`/`aria-labelledby`、无 Esc 关闭、无焦点管理 | 按第 4.2/6 节补齐 |
| B7 | 🟠 | site-industrial.css:65 | `.theme-btn` 圆角 99px 被工业层改 8px，与组件层胶囊体系冲突（视觉跳跃） | 工业层仅作用于 `.cta`；`.theme-btn` 保持胶囊 |
| B8 | 🟡 | module.js:26 | `#modTocBar` z-index:99 过低，可能被页面 fixed 头部/浮层遮挡 | 提升至 9990 层级带 |
| B9 | 🟡 | module.js:33-42,64-75 | TOC 条与设置窗文字/图标色硬编码（`#1e293b`/`#8fa3bd`/`#475569`），应引用 `var(--text)/var(--muted)` | token 化 |
| B10 | 🟡 | module.js:211-212 | 标题选择器清单硬编码（`article h2,h3`/`.content`/`main`），新页面结构需维护 | 规范固定支持清单 + 文档注释；如需扩展走组件层 |
| B11 | 🟡 | 全站 | 组件类名前缀不统一：module.js 用 `mod-`/`s-`/`t-`，index 用 `.links/.nav-actions/.theme-btn`，注入元素无类名 | 注入元素统一 `nav-gear` 等语义类名；页面级沿用各自命名但保持类名 → token 一致 |
| B12 | 🟡 | module.js:26-48 | TOC 条 hover 激活在云顶下用 `#2563eb`、深空下 `#5eead4`，与 `--blue/--cyan` 语义一致但未引用 | 引用 token（消除 B9 后自动解决） |

### 符合项（保持，勿回退）
- ✅ 双主题 token 平行体系（theme-cloud.css 与速查卡一致）
- ✅ 导航毛玻璃 + 渐变 Logo + 胶囊激活态
- ✅ 设置记忆键与 ccowork.js 共用（`ccowork.theme/wall/font` 单一键）
- ✅ 主题联动默认壁纸、theme-fading 过渡
- ✅ 点击外部关闭、`.show` 状态机
- ✅ TOC 平滑滚动 + scroll-spy + 记忆关闭 + no-toc 抑制
- ✅ 触屏 44px 最小可点（responsive.css）

## 9. 迭代指引（Agent Prompt Guide）

1. 改组件样式先找 token：颜色/圆角/投影一律 `var()`，新值先补 theme-cloud.css 引擎层，禁止在 module.js 里写裸色值。
2. 涉及主题存储改动前，先 grep `ccowork.theme` 与 `baiju-config-v2`，确认双向影响（B1 未修复前谨慎）。
3. 注入 UI 必须用类名（`nav-gear` 等），JS 只负责结构与交互，不负责外观。
4. 任何浮层组件须带：Esc 关闭 + `role`/`aria-*` + 焦点归还（第 6 节）。
5. 双主题验证清单：云顶/深空各截一次导航、设置窗、TOC 条、齿轮 hover，确认无黑块/白块突兀。
6. z-index 一律走第 5 节层级带常量，禁止新开魔数。
7. 圆角三档（9/10/50%）与四舍五入到整数；不引入第三套圆角。
8. 移动端 ≤640px：设置窗 `top:56px`、TOC 隐藏标题只留锚点（现规则保留）。
9. 改完 module.js 后在 deploy/ 镜像同步（现双目录），并跑 `test-theme.mjs`。
10. 本规范文档为唯一仲裁源；实现与规范冲突时以偏差清单更新为准，不直接改规范。

---

*规范产出：Diana（DesignMdArchitect）· 2026-08-30 · 配套工作报告见 `docs/nav-settings-optimize.md`*
