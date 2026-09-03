// 修复常见 JS 语法伤：
//  1) class 方法尾部误写成对象字面量的 `},`（class 里不允许方法间逗号）
//  2) 对象字面量方法之间漏逗号
// 并全项目扫描所有 .js 的语法错误
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKIP = new Set(['node_modules', '_archive', '_internal', 'deploy', '.git', '.workbuddy', '.tmp'])

function cleanLine(L) {
  return L.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '')
    .replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""').replace(/`[^`]*`/g, 'X')
}
function delta(L) { let d = 0; for (const ch of cleanLine(L)) { if (ch === '{') d++; else if (ch === '}') d-- } return d }

// ---- 策略 A：class 体内的方法尾逗号 ----
function fixClassCommas(src) {
  const lines = src.split(/\r?\n/)
  const out = [...lines]
  let changed = 0
  let depth = 0
  let classBody = null // class 体内（成员层）的深度值
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i]
    const d = delta(L)
    if (/^\s*class\s+[A-Za-z_$][\w$]*/.test(L) && /\{\s*$/.test(L)) {
      depth += d
      classBody = depth // class { 打开后，成员所在深度
      continue
    }
    if (classBody !== null && depth === classBody && /^\s*\}\s*$/.test(L) && d === -1) {
      // class 自身结束（处于成员层且是纯 `}`）
      classBody = null
      depth += d
      continue
    }
    // class 方法体闭合行：处理前在「方法体层」(classBody+1)，闭合后回到成员层
    if (classBody !== null && depth === classBody + 1 && d === -1 && /^\s{2,8}\},\s*$/.test(L)) {
      out[i] = L.replace(/,\s*$/, '')
      changed++
    }
    depth += d
  }
  return { code: out.join('\n'), changed }
}

// ---- 策略 B：对象字面量方法之间漏逗号 ----
const METHOD_DEF = /^ {2,6}(?:async\s+)?(?:get\s+|set\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/
const COMMENT = /^\s*(\/\*|\/\/|\*)/
function fixMissingCommas(src) {
  const lines = src.split(/\r?\n/)
  const out = [...lines]
  let added = 0
  for (let i = 0; i < lines.length; i++) {
    if (!/^ {2,6}\}$/.test(lines[i])) continue
    let k = i + 1
    while (k < lines.length && k < i + 14) {
      const t = lines[k]
      if (COMMENT.test(t) || t.trim() === '') { k++; continue }
      if (METHOD_DEF.test(t)) { out[i] = lines[i] + ','; added++ }
      break
    }
  }
  return { code: out.join('\n'), added }
}

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (e.name.endsWith('.js')) out.push(p)
  }
  return out
}

const files = await walk(ROOT)
const remaining = []
let fixedFiles = 0

for (const f of files) {
  const src = await readFile(f, 'utf8')
  const rel = relative(ROOT, f).split('\\').join('/')
  let err = null
  try { new vm.Script(src, { filename: rel }) } catch (e) { err = e }
  if (!err) continue

  for (const [name, fn] of [['class 尾逗号', fixClassCommas], ['对象漏逗号', fixMissingCommas]]) {
    const r = fn(src)
    if (!r.changed && !r.added) continue
    try {
      new vm.Script(r.code, { filename: rel })
      await writeFile(f, r.code, 'utf8')
      console.log(`  ✅ ${rel}  [${name}] 修 ${r.changed || r.added} 处 → 语法通过`)
      fixedFiles++
      err = null
      break
    } catch { /* 继续尝试下一种策略 */ }
  }
  if (err) remaining.push({ file: rel, err: String(err.message).slice(0, 80) })
}

console.log(`\n=== 扫描 ${files.length} 个 JS 文件 | 修复 ${fixedFiles} 个 ===`)
if (remaining.length) {
  console.log(`仍有问题 ${remaining.length} 个:`)
  for (const b of remaining) console.log(`  ❌ ${b.file}: ${b.err}`)
} else {
  console.log('✅ 全部 JS 文件语法通过')
}
