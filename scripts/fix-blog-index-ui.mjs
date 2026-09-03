#!/usr/bin/env node
/* ============================================================
   fix-blog-index-ui.mjs · A 线防回退资产（零依赖 · 幂等）
   ⚠️ 背景：B 线内容管线重建 blog/index.html 时使用旧模板，
   会回退「cc-ic SVG 图标体系（d3b786d 决定）+ cc-pg-cover 配图」。
   本脚本把这些 UI 组件按 HEAD 标准恢复，管线每次重建后跑一次即可。

   幂等：检测到导航已含 cc-ic 图标则直接跳过（安全重跑）。

   用法：node scripts/fix-blog-index-ui.mjs [--dry]
   --dry 只打印将改动的点，不落盘。
   ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const FILE = path.join(ROOT, 'blog', 'index.html')
const DRY = process.argv.includes('--dry')

/* ---------- HEAD 版文章卡片图标映射（href → data-ic） ---------- */
const ICON_BY_HREF = {
  '2026年8月AI工具横评：别追概念，这4款工具真能帮你每天省2小时.html': 'wrench',
  '2026-08-30-爆款-5个免费AI工具救了我大学4年：从期末3天突击80+到本科发2篇普刊，绩点从2..html': 'wrench',
  '2026-08-28-爆款-每天加班3小时到准点走：我用3个AI工具把周工作量压到16小时，老板还以为我招了.html': 'wrench',
  '2026-08-30-爆款-17个AI工具按场景怎么选：别再乱花钱了，真正每天用的是这6个.html': 'wrench',
  '2026年8月AI工具横评：3类高频场景实测，避开90%的功能宣传陷阱.html': 'wrench',
  '深度长文.html': 'book',
  '最新开源对话式AI项目全景与一键使用指南.html': 'lock-open',
  '大模型原理与Transformer.html': 'brain',
  '开源AI进阶-网络安全一人公司与手机操作.html': 'lock-open',
  '提示词工程实战.html': 'compass',
  '公务员AI应用指南.html': 'landmark',
  '制造业AI应用实战.html': 'building-2',
  '中国AI发展史.html': 'bot',
  'AI视频制作实战.html': 'clapperboard',
  'AI绘画从入门到精通.html': 'palette',
  'AI编程进阶实战.html': 'user',
  'AI时代工科学习-编程计算机数控仿真实战.html': 'graduation-cap',
  'AI未来趋势-数字物理量子新质材料.html': 'bot',
  'AI实战全书.html': 'bot',
  'AI教育应用实战.html': 'school',
  'AI医疗应用指南.html': 'cross',
  'AI变现实操手册.html': 'bot',
  'AI创业实战指南.html': 'briefcase',
  '2026年中AI视频创作落地观察：别追参数了，这3个方法能把变现效率拉满.html': 'clapperboard',
  'AI写作完全指南.html': 'bot',
  'Agent智能体实战.html': 'cc-mark',
  '2026年中AI视频创作落地观察：别卷参数了，这3个实操方向才是普通人的变现路径.html': 'clapperboard',
  '2026年中AI创业观察：别追大模型热点，赚确定的钱才是活下去的核心.html': 'briefcase',
  '2026年中AI学习路径实测：别再啃3年前的旧教程了，这是我验证过的无水分入门到落地路线.html': 'graduation-cap',
  '2026年8月实测：别迷信“全AI办公”，这4个落地场景才是真的省时间.html': 'monitor',
  '2026年8月AI创业复盘：别追大模型热点，这3个垂直方向已经跑通正向现金流.html': 'briefcase',
  '2026.08.25-AI智能体现状：别再做Demo了，这3个可落地方案我跑了3个月ROI超300%.html': 'bot',
  '2026-年-AI-视频创作实战：从提示词到导演的完整工作流.html': 'clapperboard',
  '2026-08-31-本周AI大事记-2026年8月第5周.html': 'bot',
  '2026-AI-进阶实战：从模型原理到-Agent-部署的完整学习路径.html': 'graduation-cap',
  /* 管线新增（2026-09-01 起） */
  '2026-09-01-爆款-3个Agent协作开源AI助手实测.html': 'bot',
  '2026.9.1-大模型落地观察：别追参数神话，这3个技术方向已经跑出真ROI.html': 'brain',
}
const FALLBACK_ICON = 'bot'

const COVER = '<figure class="cc-pg-cover" style="margin:0 0 22px;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.10);background:linear-gradient(120deg,#4f8cff22,#8b5cf622);"><img src="../assets/pg/pg-blog-index.png" alt="博客目录 · 白驹全局大脑" loading="lazy" style="display:block;width:100%;height:clamp(180px,32vw,340px);object-fit:cover;"></figure>\n'

let html = fs.readFileSync(FILE, 'utf8')
const changes = []

/* 幂等守卫：导航已含 cc-ic 图标 → 已修复，直接退出 */
if (html.includes('<i class="cc-ic"') && !html.includes('<span class="pico">🧰')) {
  console.log('✅ 已是 cc-ic 版本，无需修复（幂等跳过）')
  process.exit(0)
}

/* 1) brand logo：🐎 → cc-mark */
if (html.includes('<span class="logo">🐎</span>')) {
  html = html.replace('<span class="logo">🐎</span>', '<span class="logo"><i class="cc-mark" aria-hidden="true"></i></span>')
  changes.push('brand logo → cc-mark')
}

/* 2) 导航链接：emoji 前缀 → cc-ic */
const NAV_ICONS = [
  ['../index.html', 'message-circle', '💬'],
  ['../website/hub.html', 'globe', '🌐'],
  ['../website/ai-academy.html', 'graduation-cap', '🎓'],
  ['index.html', 'pen-line', '📝'],
]
for (const [href, ic, emoji] of NAV_ICONS) {
  const re = new RegExp(`(<a href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" class="cur">|)(\\s*${emoji}\\s*)(首页|知识库|AI 学院|博客)` )
  // 简化处理：按 emoji+文案匹配
}
/* 逐个替换（不依赖 regex 分组复杂化） */
const navMap = [
  ['<a href="../index.html">💬 首页</a>', '<a href="../index.html"><i class="cc-ic" data-ic="message-circle" aria-hidden="true"></i>首页</a>'],
  ['<a href="../website/hub.html">🌐 知识库</a>', '<a href="../website/hub.html"><i class="cc-ic" data-ic="globe" aria-hidden="true"></i>知识库</a>'],
  ['<a href="../website/ai-academy.html">🎓 AI 学院</a>', '<a href="../website/ai-academy.html"><i class="cc-ic" data-ic="graduation-cap" aria-hidden="true"></i>AI 学院</a>'],
  ['<a href="index.html" class="cur">📝 博客</a>', '<a href="index.html" class="cur"><i class="cc-ic" data-ic="pen-line" aria-hidden="true"></i>博客</a>'],
]
for (const [from, to] of navMap) {
  if (html.includes(from)) { html = html.replace(from, to); changes.push(`nav: ${from.slice(0, 40)} → cc-ic`) }
}

/* 3) theme-btn：🌙 → cc-theme-ics 双图标 */
if (html.includes('title="切换亮暗主题">🌙</button>')) {
  html = html.replace(
    'title="切换亮暗主题">🌙</button>',
    'title="切换亮暗主题"><span class="cc-theme-ics" aria-hidden="true"><i class="cc-ic cc-ic-moon" data-ic="moon"></i><i class="cc-ic cc-ic-sun" data-ic="sun"></i></span></button>'
  )
  changes.push('theme-btn → cc-theme-ics')
}

/* 4) badge：🐎 前缀 → cc-mark */
if (html.includes('<div class="badge">🐎 ')) {
  html = html.replace('<div class="badge">🐎 ', '<div class="badge"><i class="cc-mark" aria-hidden="true"></i>')
  changes.push('badge → cc-mark')
}

/* 5) footer logo：🐎 → cc-mark */
if (html.includes('<div class="logo-row"><span class="logo">🐎</span>')) {
  html = html.replace('<div class="logo-row"><span class="logo">🐎</span>', '<div class="logo-row"><span class="logo"><i class="cc-mark" aria-hidden="true"></i></span>')
  changes.push('footer logo → cc-mark')
}

/* 6) 文章卡片：emoji pico → cc-ic（按 href 映射） */
const EMOJI_RE = /<a class="pcard" href="([^"]+)"><span class="pico">([^<]+)<\/span>/g
let m
let cardFixed = 0
while ((m = EMOJI_RE.exec(html)) !== null) {
  const href = m[1]
  const ic = ICON_BY_HREF[href] || FALLBACK_ICON
  const tag = ic === 'cc-mark'
    ? `<a class="pcard" href="${href}"><span class="pico"><i class="cc-mark" aria-hidden="true"></i></span>`
    : `<a class="pcard" href="${href}"><span class="pico"><i class="cc-ic" data-ic="${ic}" aria-hidden="true"></i></span>`
  html = html.replace(m[0], tag)
  cardFixed++
}
if (cardFixed) changes.push(`pcard 图标 ×${cardFixed}`)

/* 7) themeBtn JS：emoji 切换 → dataset.deep 桥接 */
const jsFrom = `if(b)b.textContent=next==='deep'?'☀️':'🌙';`
const jsTo = `if(b)b.dataset.deep=(next==='deep')?'1':'';`
let jsFixed = 0
while (html.includes(jsFrom)) { html = html.replace(jsFrom, jsTo); jsFixed++ }
if (jsFixed) changes.push(`themeBtn JS ×${jsFixed}`)

/* 8) cc-pg-cover：缺失则恢复 */
if (!html.includes('cc-pg-cover')) {
  html = html.replace('<nav class="top">', COVER + '<nav class="top">')
  changes.push('cc-pg-cover 恢复')
}

if (DRY) {
  console.log(`[dry] 将应用 ${changes.length} 处修改：`)
  changes.forEach(c => console.log('  -', c))
  process.exit(0)
}

fs.writeFileSync(FILE, html, 'utf8')
console.log(`✅ 已应用 ${changes.length} 处修改：`)
changes.forEach(c => console.log('  -', c))
if (!changes.length) console.log('  （无改动）')
