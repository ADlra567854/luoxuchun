// inject-search.mjs · A3 全站搜索 · 给未加载 module.js 的页面注入 search.js（幂等）
// 用法：node scripts/inject-search.mjs [--dry-run]
// 原则：只追加一个 <script src="/search.js"></script>（与页面既有 ccowork.js 注入同一模式），
//       不修改任何现有内容；已含 search.js 或已含 module.js（module.js 会自动加载 search.js）的页面跳过。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const DRY = process.argv.includes('--dry-run')
const SKIP_DIR = new Set(['_internal', 'templates', 'deploy', '_archive', '.git', 'node_modules', 'scripts', 'docs', 'data'])
const TAG = '<script src="/search.js"></script>'

let injected = 0, skipped = 0, total = 0
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(path.join(dir, e.name)); continue }
    if (!e.name.endsWith('.html')) continue
    const abs = path.join(dir, e.name)
    const html = fs.readFileSync(abs, 'utf8')
    total++
    if (html.includes('search.js') || html.includes('module.js')) { skipped++; continue }
    if (!/<\/body>/i.test(html)) { console.warn('⚠️ 无 </body>，跳过: ' + abs.replace(ROOT, '.')); skipped++; continue }
    const out = html.replace(/<\/body>/i, '  ' + TAG + '\n</body>')
    if (out === html) { skipped++; continue }
    if (!DRY) fs.writeFileSync(abs, out, 'utf8')
    injected++
    console.log((DRY ? '[dry-run] ' : '') + '注入: ' + abs.replace(ROOT, '.'))
  }
}
walk(ROOT)
console.log('✅ ' + (DRY ? '[dry-run] ' : '') + '扫描 ' + total + ' 页：注入 ' + injected + '，跳过 ' + skipped + '（已含 search.js / 由 module.js 覆盖）')
