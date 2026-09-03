// 全站图片体检：找出「零本地图」与「依赖外链图」的页面
import { readFile, writeFile } from 'node:fs/promises'
import { join, relative, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKIP = ['node_modules', 'deploy', '.git', '_archive', '_internal', '.workbuddy']

async function walk(dir, out = []) {
  for await (const e of await (await import('node:fs/promises')).readdir(dir, { withFileTypes: true })) {
    if (SKIP.includes(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const files = await walk(ROOT)
const noImg = []
const extImg = []
const stats = { total: files.length, withLocalImg: 0, noImg: 0 }

for (const f of files) {
  const html = await readFile(f, 'utf8')
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  const imgs = [...body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])
  const locals = imgs.filter((s) => !/^https?:/i.test(s) && !s.startsWith('data:'))
  const exts = imgs.filter((s) => /^https?:/i.test(s))
  const rel = relative(ROOT, f).replace(/\\/g, '/')
  if (locals.length > 0) { stats.withLocalImg++; continue }
  // 无本地图：记录
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
  const rec = { file: rel, title: title.trim(), imgCount: imgs.length, extHosts: [...new Set(exts.map((u) => { try { return new URL(u).host } catch { return u.slice(0, 30) } }))] }
  noImg.push(rec)
  if (exts.length) extImg.push(rec)
}
stats.noImg = noImg.length

// 按目录分组统计
const byDir = {}
for (const r of noImg) {
  const d = r.file.split('/').slice(0, -1).join('/') || '(根)'
  byDir[d] = (byDir[d] || 0) + 1
}

const report = {
  generatedAt: new Date().toISOString(),
  stats,
  byDir: Object.entries(byDir).sort((a, b) => b[1] - a[1]),
  noImgPages: noImg.sort((a, b) => a.file.localeCompare(b.file)),
  extOnlyPages: extImg,
}
await writeFile(join(ROOT, 'scripts', '_image-scan.json'), JSON.stringify(report, null, 2), 'utf8')

console.log('=== 全站图片体检 ===')
console.log(`页面总数: ${stats.total}`)
console.log(`含本地图: ${stats.withLocalImg}`)
console.log(`无本地图: ${stats.noImg}（其中依赖外链图 ${extImg.length}）`)
console.log('\n=== 缺图页面按目录分布 ===')
for (const [d, c] of report.byDir) console.log(`  ${String(c).padStart(4)}  ${d}`)
console.log('\n=== 前 40 个缺图页面 ===')
for (const r of noImg.slice(0, 40)) console.log(`  ${r.file}  | 图${r.imgCount} | ${r.title.slice(0, 40)}`)
console.log('\n明细已写入 scripts/_image-scan.json')
