// 批量给所有 HTML 页注入 ccowork 悬浮工作台插件
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const VERSION = '19'  // 版本号：修改插件后 +1，强制浏览器刷新缓存
const TAG = '<script src="/ccowork.js?v=' + VERSION + '"></script>'

function walkHtml(dir, out) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) { if (!e.startsWith('.')) walkHtml(full, out); continue }
    if (e.endsWith('.html')) out.push(full)
  }
  return out
}

const targets = walkHtml(ROOT, [])
let injected = 0, skipped = 0, updated = 0
for (const f of targets) {
  let html = readFileSync(f, 'utf-8')
  // 已注入旧版本号 → 升级版本号
  if (/ccowork\.js\?v=\d+/.test(html)) {
    html = html.replace(/ccowork\.js\?v=\d+/g, 'ccowork.js?v=' + VERSION)
    writeFileSync(f, html, 'utf-8')
    updated++
    continue
  }
  // 已注入但无版本号 → 补上版本号（强制刷新缓存）
  if (html.includes('ccowork.js')) {
    html = html.replace(/src="\/ccowork\.js"/g, 'src="/ccowork.js?v=' + VERSION + '"')
    writeFileSync(f, html, 'utf-8')
    updated++
    continue
  }
  const out = html.replace(/<\/body>/i, TAG + '\n</body>')
  if (out !== html) {
    writeFileSync(f, out, 'utf-8')
    injected++
    console.log('注入 ✓', f.replace(ROOT, '.'))
  }
}
console.log('完成：注入 ' + injected + ' 个页面，升级版本 ' + updated + ' 个，已存在跳过 ' + skipped + ' 个')
