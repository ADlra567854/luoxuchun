// lib-book-cover.mjs · 书系 PDF 品牌封面（共享模块，B3 五期）
// 三个 PDF 脚本（gen-book-pdf / pdf2 / pdf3）统一引用，保证全站书系视觉一致
// 设计语言与站点 deep 主题一致：深空渐变 + 白驹品牌徽章 + 渐变分隔线

export const COVER_CSS = `
.cover{page-break-after:always;text-align:center;padding:58mm 18mm 30mm;min-height:261mm;color:#e9f0fb;background:linear-gradient(160deg,#0b1026 0%,#101728 48%,#1a1140 100%)}
.cover .badge{display:inline-block;border:1px solid rgba(142,179,255,.35);background:rgba(91,140,255,.12);color:#9db8ff;border-radius:999px;padding:0.4em 1.2em;font-size:10pt;letter-spacing:.06em}
.cover h1{font-size:2.5em;line-height:1.35;color:#fff;border:none;margin:0.55em 0 0.15em}
.cover .sub{color:#8fa3bd;font-size:1.15em;margin-top:0.35em}
.cover .rule{width:88px;height:3px;margin:1.5em auto;background:linear-gradient(90deg,#38e1ff,#5b8cff 45%,#8b5cf6);border-radius:3px}
.cover .meta{color:#6f83a0;font-size:9.5pt;line-height:1.9;margin-top:3.2em}
.cover .meta b{color:#9db8ff;font-weight:600}
`

export function coverHTML({ title, sub, chapters, extra = '' }) {
  return `<div class="cover">
  <div class="badge">🐎 白驹 · 全局大脑</div>
  <h1>${title}</h1>
  <div class="rule"></div>
  <div class="sub">${sub}</div>
  <div class="meta"><b>ccowork 出品</b> · 全书 ${chapters} 章<br/>${extra || '复用于白驹站点书系章节'}</div>
</div>`
}
