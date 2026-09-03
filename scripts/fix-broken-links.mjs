// 修复 check-links.mjs 报出的真实断链（JS 模板拼接造成的误报不处理）
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const FIXES = [
  // 层级写错（多退一级）
  { file: 'book/具身智能.html', from: '"../../index.html"', to: '"../index.html"', why: 'book/ 下一级即可到根' },
  { file: 'website/book/AI实战全书.html', from: '"../blog/index.html"', to: '"../../blog/index.html"', why: 'website/book/ 需退两级' },
  { file: 'website/ai-academy/projects/code-reviewer.html', from: '"../../website/ai-academy-projects.html"', to: '"../../ai-academy-projects.html"', why: '退两级已在 website/ 下' },
  // 同目录文件被写成上级
  { file: 'website/ai-academy-cert.html', from: '"../hub.html"', to: '"hub.html"', why: 'hub.html 就在 website/ 下' },
  { file: 'website/ai-academy-cert.html', from: '"../ai-academy.html"', to: '"ai-academy.html"', why: '同目录' },
  { file: 'website/ai-academy-cert.html', from: '"../agent.html"', to: '"agent.html"', why: '同目录' },
  { file: 'website/ai-academy-projects.html', from: '"../ai-academy-roadmap.html"', to: '"ai-academy-roadmap.html"', why: '同目录' },
  { file: 'website/ai-academy-projects.html', from: '"../ai-academy-cert.html"', to: '"ai-academy-cert.html"', why: '同目录' },
  { file: 'website/ai-academy-projects.html', from: '"../ai-academy-jobs.html"', to: '"ai-academy-jobs.html"', why: '同目录' },
  { file: 'website/ai-academy-projects.html', from: '"../ai-academy-interview.html"', to: '"ai-academy-interview.html"', why: '同目录' },
  // 指向不存在的资源
  { file: 'linguavista/index.html', from: '"../docs/prd-linguavista.html"', to: '"../docs/prd-linguavista.md"', why: '实际文件是 .md' },
  { file: 'website/ai-academy/chapter-07.html', from: '"../chapter6/第六章%20框架开发实践.md#习题"', to: '"chapter-06.html#习题"', why: 'md 已转 html 且同目录' },
  { file: 'website/ai-academy/chapter-05.html', from: '<a href="code/chapter5/HelloAgent_difyCase.yml">完整工作流</a>', to: '<em>完整工作流</em>', why: 'yml 资源不存在，降级为文本' },
]

let ok = 0, miss = 0
for (const f of FIXES) {
  const abs = join(ROOT, f.file)
  let html
  try { html = await readFile(abs, 'utf8') } catch { console.log(`  ⚠ 文件不存在: ${f.file}`); miss++; continue }
  if (!html.includes(f.from)) { console.log(`  ⏭ 未匹配(可能已修): ${f.file} ← ${f.from.slice(0, 46)}`); miss++; continue }
  await writeFile(abs, html.split(f.from).join(f.to), 'utf8')
  console.log(`  ✅ ${f.file}  ${f.why}`)
  ok++
}
console.log(`\n修复 ${ok} 处，跳过 ${miss} 处`)
