// 把 website/_corpus.html 里的 window.BJ_CORPUS={...} 提取成可正常 <script> 加载的 .js
// （原 _corpus.html 是完整 HTML 文档，浏览器当脚本加载会报 Unexpected token '<'，
//  导致语料从未真正加载；提取成 .js 后即可正常注入 window.BJ_CORPUS）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'website', '_corpus.html')
const OUT = path.join(ROOT, 'website', '_corpus.js')

const raw = fs.readFileSync(SRC, 'utf8')
const MARK = 'window.BJ_CORPUS='
const mi = raw.indexOf(MARK)
const si = raw.indexOf('</script>', mi)
if (mi < 0 || si < 0) { console.error('无法定位语料边界'); process.exit(1) }
let sub = raw.slice(mi + MARK.length, si).trim()
if (sub.endsWith(';')) sub = sub.slice(0, -1)
const obj = JSON.parse(sub) // 校验 JSON 合法
let out = 'window.BJ_CORPUS=' + JSON.stringify(obj) + ';'
out = out.replace(/<\/script>/gi, '<\\/script>') // 防止提前闭合 script 标签
fs.writeFileSync(OUT, out)
console.log('语料导出完成:', Object.keys(obj).length, '部 →', OUT, '(', (out.length / 1024).toFixed(0), 'KB )')
