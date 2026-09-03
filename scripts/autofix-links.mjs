// 通用断链自动修复：对每条断链，全站找同名文件 → 重写为正确相对路径
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, dirname, relative, basename, resolve, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKIP = new Set(['node_modules', '_archive', '_internal', 'deploy', '.git', '.workbuddy'])

// 1) 建索引：全站所有文件名 → 绝对路径列表
const index = new Map()
async function build(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await build(p)
    else {
      const k = e.name
      if (!index.has(k)) index.set(k, [])
      index.get(k).push(p)
    }
  }
}
await build(ROOT)

// 2) 扫 HTML
const htmls = []
async function collect(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await collect(p)
    else if (e.name.endsWith('.html')) htmls.push(p)
  }
}
await collect(ROOT)

let fixed = 0, unresolved = 0
const unresolvedList = []

for (const f of htmls) {
  const html = await readFile(f, 'utf8')
  const rel = relative(ROOT, f).split(sep).join('/')
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/g
  const targets = new Map() // 断链原文 → 期望文件名
  let m
  while ((m = re.exec(html)) !== null) {
    const u = m[1]
    if (!u || u.startsWith('#') || /^(https?:|data:|javascript:|mailto:|tel:|\/\/)/.test(u)) continue
    // 跳过 JS 模板拼接产物（运行时才有效）
    if (u.includes('${') || /\/$/.test(u) || /[-=]$/.test(u.split(/[?#]/)[0])) continue
    const clean = u.split(/[?#]/)[0]
    if (!clean) continue
    let dec = clean
    try { dec = decodeURIComponent(clean) } catch { dec = clean }
    const abs = clean.startsWith('/') ? join(ROOT, dec) : resolve(dirname(f), dec)
    let exists = true
    try { await stat(normalize(abs)) } catch { exists = false }
    if (!exists) targets.set(u, basename(dec))
  }
  if (!targets.size) continue

  let out = html
  for (const [orig, name] of targets) {
    const cands = (index.get(name) || []).filter((p) => p !== f)
    if (cands.length === 0) { unresolved++; unresolvedList.push({ from: rel, link: orig, reason: '全站无同名文件' }); continue }
    // 优先选同目录，其次选层级最接近的
    const pageDir = dirname(f)
    cands.sort((a, b) => {
      const da = dirname(a) === pageDir ? 0 : 1
      const db = dirname(b) === pageDir ? 0 : 1
      if (da !== db) return da - db
      return Math.abs(relative(pageDir, dirname(a)).split(sep).length) - Math.abs(relative(pageDir, dirname(b)).split(sep).length)
    })
    const best = cands[0]
    let newRel = relative(pageDir, best).split(sep).join('/')
    if (!newRel.startsWith('.')) newRel = './' + newRel
    // 保留原 query/hash
    const suffix = orig.slice(orig.indexOf('#') >= 0 ? orig.indexOf('#') : orig.length)
    const newLink = newRel + suffix
    const before = out
    out = out.split(`"${orig}"`).join(`"${newLink}"`).split(`'${orig}'`).join(`'${newLink}'`)
    if (out !== before) { fixed++; console.log(`  ✅ ${rel}\n     ${orig}  →  ${newLink}`) }
  }
  if (out !== html) await writeFile(f, out, 'utf8')
}

console.log(`\n=== 自动修复 ${fixed} 处 | 无法自动修复 ${unresolved} 处 ===`)
for (const u of unresolvedList) console.log(`  ⚠ ${u.from} → ${u.link}  (${u.reason})`)
