// inject-stats.mjs · B4 轻量统计 · 给未加载 module.js 的页面注入 stats.js（幂等）
// 用法：node scripts/inject-stats.mjs [--dry-run]
// 原则：只追加 <script src="/stats.js"></script>；已含 stats.js 或已含 module.js（module.js 自动加载 stats.js）的页面跳过。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const DRY = process.argv.includes('--dry-run')
const SKIP_DIR = new Set(['_internal', 'templates', 'deploy', '_archive', '.git', 'node_modules', 'scripts', 'docs', 'data'])
const TAG = '<script src="/stats.js"></script>'

let injected = 0, skipped = 0, total = 0
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(path.join(dir, e.name)); continue }
    if (!e.name.endsWith('.html')) continue
    const abs = path.join(dir, e.name)
    total++
    const html = fs.readFileSync(abs, 'utf8')
    if (html.includes('stats.js') || html.includes('module.js')) { skipped++; continue }
    if (!html.includes('</body>')) { skipped++; continue }
    if (!DRY) fs.writeFileSync(abs, html.replace('</body>', TAG + '\n</body>'), 'utf8')
    injected++
    console.log('✓', path.relative(ROOT, abs))
  }
}
walk(ROOT)
console.log(`========== stats 注入报告 ==========`)
console.log(`页面总数：${total} | 注入：${injected} | 跳过（已含 module.js/stats.js）：${skipped}${DRY ? '（dry）' : ''}`)
