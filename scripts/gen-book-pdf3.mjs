// gen-book-pdf3.mjs · B3 四期：三本推广书 PDF 导出（对齐之路 / 具身智能 / 中国科技故事）+ 书系 ZIP 打包
// 用法: node scripts/gen-book-pdf3.mjs [--only 对齐之路|具身智能|中国科技故事] [--no-zip]
// 复用 gen-book-pdf2.mjs 的 Playwright print-to-PDF 模式，章节顺序与 epub3 保持一致
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { COVER_CSS, coverHTML } from './lib-book-cover.mjs'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const OUT_DIR = path.join(ROOT, 'website', 'book')

const BOOKS = {
  '对齐之路': {
    title: '对齐之路',
    sub: 'AI 安全与人类的抉择',
    files: [path.join(ROOT, 'book', '对齐之路.html')],
  },
  '具身智能': {
    title: '具身智能',
    sub: '当 AI 拥有了身体',
    files: [path.join(ROOT, 'book', '具身智能.html')],
  },
  '中国科技故事': {
    title: '中国科技故事',
    sub: '从 DeepSeek 到钱学森：18 篇中国科技群像',
    dir: path.join(ROOT, 'book', '五卷全书', '中国科技故事'),
  },
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const stripNav = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
  .replace(/<nav[\s\S]*?<\/nav>/gi, '')
  .replace(/<svg[\s\S]*?<\/svg>/gi, '')
  .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  .replace(/\s+(style|class|id|data-[a-z-]+|width|height|align|valign|border)="[^"]*"/gi, '')

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

function extractChapter(fp, fallbackTitle) {
  const html = fs.readFileSync(fp, 'utf8')
  const m = html.match(/<article[\s>][\s\S]*?<\/article>/i)
  let seg = m ? m[0] : (html.match(/<main[\s>][\s\S]*?<\/main>/i) || [''])[0]
  if (!seg) { const b = html.match(/<body[\s>][\s\S]*?<\/body>/i); seg = b ? b[0] : '' }
  const h1 = seg.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : fallbackTitle
  return { title, body: stripNav(seg).replace(/^<article>\s*/i, '').replace(/<\/article>\s*$/i, '') }
}

function collectFiles(cfg) {
  if (cfg.dir) {
    const names = fs.readdirSync(cfg.dir).filter((n) => n.endsWith('.html'))
    // README 目录排前，其余按数字前缀排序（01-18）
    names.sort((a, b) => {
      const aReadme = a.includes('README') ? 0 : 1
      const bReadme = b.includes('README') ? 0 : 1
      if (aReadme !== bReadme) return aReadme - bReadme
      return a.localeCompare(b, 'zh-CN', { numeric: true })
    })
    return names.map((n) => path.join(cfg.dir, n))
  }
  return cfg.files
}

async function renderPdf(key, cfg, only) {
  if (only && only !== key) return
  const files = collectFiles(cfg)
  const chapters = []
  for (const fp of files) {
    const fallback = path.basename(fp, '.html').replace(/^\d+-/, '').replace(/^README-/, '')
    chapters.push(extractChapter(fp, fallback))
  }
  if (!chapters.length) { console.log(`[skip] ${key}: 无章节`); return }

  const body = chapters.map((c) => `<section class="chapter">${c.body}</section>`).join('\n')
  const full = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(cfg.title)}</title><style>${CSS}</style></head>
<body>
${coverHTML({ title: cfg.title, sub: cfg.sub, chapters: chapters.length })}
${body}
</body></html>`
  const tmp = path.join(ROOT, '_tmp-book3.html')
  fs.writeFileSync(tmp, full, 'utf8')
  const out = path.join(OUT_DIR, `${cfg.title}.pdf`)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto('file:///' + tmp.replace(/\\/g, '/'), { waitUntil: 'networkidle' })
    await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
  } finally {
    await browser.close()
  }
  fs.rmSync(tmp, { force: true })
  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(1)
  console.log(`✅ PDF: ${out} | ${size} MB | ${chapters.length} 章`)
}

// 书系 ZIP 一键打包（全部 EPUB+PDF，Python zipfile 保证 UTF-8 文件名）
function makeZip() {
  const out = path.join(OUT_DIR, 'ccowork-book-pack.zip')
  if (fs.existsSync(out)) fs.rmSync(out, { force: true })
  const script = `
import zipfile, os, glob
out = ${JSON.stringify(out)}
files = sorted(glob.glob(os.path.join(${JSON.stringify(OUT_DIR)}, '*.epub')) + glob.glob(os.path.join(${JSON.stringify(OUT_DIR)}, '*.pdf')))
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f, os.path.basename(f))
print('ZIP files:', len(files), '->', round(os.path.getsize(out)/1024, 1), 'KB')
`
  execFileSync('python', ['-c', script], { stdio: 'inherit' })
}

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] || null
const doZip = !process.argv.includes('--no-zip')

;(async () => {
  for (const [key, cfg] of Object.entries(BOOKS)) await renderPdf(key, cfg, only)
  if (doZip && !only) makeZip()
  console.log('✅ B3 四期完成')
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
