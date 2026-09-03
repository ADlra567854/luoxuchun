// 迭代修复 _corpus.html 中损坏的 window.BJ_CORPUS JSON：
// 利用 V8 JSON.parse 报错里的 position，定位每次出错前那个未转义的 '"' 并转义，循环到整段合法。
import fs from 'node:fs'

const F = 'website/_corpus.html'
const raw = fs.readFileSync(F, 'utf8')
const MARK = 'window.BJ_CORPUS='
const mi = raw.indexOf(MARK)
const si = raw.indexOf('</script>', mi)
if (mi < 0 || si < 0) { console.error('无法定位语料边界'); process.exit(1) }

let sub = raw.slice(mi + MARK.length, si).trim()
if (sub.endsWith(';')) sub = sub.slice(0, -1)

let iter = 0
const MAX = 10000
while (iter < MAX) {
  iter++
  try {
    const obj = JSON.parse(sub)
    // 合法：写出干净的 _corpus.html
    const head = raw.slice(0, mi)
    const tail = raw.slice(si)
    const out = head + MARK + JSON.stringify(obj) + tail
    fs.writeFileSync(F, out, 'utf8')
    // 二次自检
    const v = JSON.parse(out.slice(out.indexOf(MARK) + MARK.length, out.indexOf('</script>', out.indexOf(MARK))))
    console.log('✅ 修复完成，迭代', iter, '次，总书稿', Object.keys(v).length, '部')
    process.exit(0)
  } catch (e) {
    const m = /position (\d+)/.exec(e.message)
    if (!m) { console.error('❌ 非引号类错误，无法自动修复:', e.message); process.exit(2) }
    const p = +m[1]
    // 找到 position 之前最近的一个未转义 '"'
    let q = p - 1
    while (q >= 0) {
      if (sub[q] === '"') {
        // 检查前一个字符是不是反斜杠（已是转义）
        if (q > 0 && sub[q - 1] === '\\') { q--; continue }
        // 转义这个未转义的引号
        sub = sub.slice(0, q) + '\\' + sub.slice(q)
        break
      }
      q--
    }
    if (q < 0) { console.error('❌ 找不到可转义的引号，停止于:', e.message); process.exit(3) }
  }
}
console.error('❌ 超过最大迭代', MAX)
process.exit(4)
