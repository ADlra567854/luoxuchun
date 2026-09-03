// gen-book-pdf.mjs · 《AI 实战全书》PDF 导出（Playwright Chromium print-to-PDF，零额外依赖）
// 用法: node scripts/gen-book-pdf.mjs [--out <path>]
// 章节顺序与 gen-book-epub.py 保持一致（导读→第1-16章→补充篇）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { COVER_CSS, coverHTML } from './lib-book-cover.mjs'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const PAGES = path.join(ROOT, 'website', 'book', 'pages')
const OUT = path.join(ROOT, 'website', 'book', 'AI实战全书.pdf')

const CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 }
const chapKey = (f) => {
  const base = path.basename(f)
  const m = base.match(/第\s*([0-9一二三四五六七八九十]+)\s*章/)
  if (m) {
    const num = m[1]
    if (/^\d+$/.test(num)) return [1, +num]
    if (CN_NUM[num]) return [1, CN_NUM[num]]
    if (num.includes('十')) return [1, 10 + (CN_NUM[num.replace('十', '')] || 0)]
    return [1, 99]
  }
  return [2, base]
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const stripNav = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
  .replace(/<nav[\s\S]*?<\/nav>/gi, '')
  .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  .replace(/\s+(style|class|id|data-[a-z-]+)="[^"]*"/gi, '')

const files = fs.readdirSync(PAGES).filter((f) => f.endsWith('.html')).sort((a, b) => {
  const ka = chapKey(a), kb = chapKey(b)
  return ka[0] - kb[0] || (ka[0] === 1 ? ka[1] - kb[1] : ka[1] < kb[1] ? -1 : 1)
}).map((f) => path.join(PAGES, f))
const ordered = files.filter((f) => path.basename(f).includes('05-书稿总目录')).concat(
  files.filter((f) => !path.basename(f).includes('05-书稿总目录')))

const CSS = `@page{size:A4;margin:18mm 16mm}
*{box-sizing:border-box}
body{font-family:"Source Han Serif SC","Noto Serif SC","Songti SC",serif;line-height:1.8;color:#1a1a1a;font-size:11pt}
h1{font-size:1.7em;line-height:1.4;margin:0 0 0.6em;padding-bottom:0.3em;border-bottom:2px solid #333}
h2{font-size:1.3em;margin:1.3em 0 0.5em}
h3{font-size:1.12em;margin:1em 0 0.4em}
p{margin:0.5em 0;text-align:justify}
ul,ol{padding-left:1.5em;margin:0.5em 0}
li{margin:0.25em 0}
blockquote{margin:0.7em 0;padding:0.5em 1em;border-left:3px solid #888;background:#f5f5f5}
pre{font-family:Consolas,"Courier New",monospace;font-size:9pt;background:#f6f6f6;border:1px solid #ddd;border-radius:5px;padding:0.8em;white-space:pre-wrap;word-break:break-all;margin:0.7em 0}
code{font-family:Consolas,monospace;font-size:0.92em;background:#f2f2f2;padding:0.1em 0.3em;border-radius:3px}
table{border-collapse:collapse;width:100%;margin:0.8em 0;font-size:9.5pt;page-break-inside:avoid}
th,td{border:1px solid #aaa;padding:0.4em 0.55em;text-align:left}
th{background:#eee}
hr{border:none;border-top:1px solid #ccc;margin:1.2em 0}
img{max-width:100%}
.chapter{page-break-before:always}
.chapter:first-of-type{page-break-before:avoid}
${COVER_CSS}
`

;(async () => {
  const chapters = ordered.map((f) => {
    const html = fs.readFileSync(f, 'utf8')
    const m = html.match(/<article[\s>][\s\S]*?<\/article>/i)
    let seg = m ? m[0] : (html.match(/<main[\s>][\s\S]*?<\/main>/i) || [''])[0]
    if (!seg) { const b = html.match(/<body[\s>][\s\S]*?<\/body>/i); seg = b ? b[0] : '' }
    const h1 = seg.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const title = h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : path.basename(f, '.html')
    return { title, body: stripNav(seg) }
  })

  const body = chapters.map((c, i) => {
    const inner = c.body.replace(/^<article>\s*/i, '').replace(/<\/article>\s*$/i, '')
    return i === 0 ? `<section class="chapter">${inner}</section>`
      : `<section class="chapter">${inner}</section>`
  }).join('\n')

  const full = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc('AI 实战全书')}</title><style>${CSS}</style></head>
<body>
${coverHTML({ title: 'AI 实战全书', sub: 'AI 工具简史与实战全书', chapters: chapters.length, extra: '旗舰产品 · 贯穿全站的实战圣经' })}
${body}
</body></html>`
  fs.writeFileSync(path.join(ROOT, '_tmp-book.html'), full, 'utf8')

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('file:///' + path.join(ROOT, '_tmp-book.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' })
  await page.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
  await browser.close()
  fs.rmSync(path.join(ROOT, '_tmp-book.html'), { force: true })

  const size = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1)
  console.log(`✅ PDF 生成: ${OUT} | ${size} MB | ${chapters.length} 章`)
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
