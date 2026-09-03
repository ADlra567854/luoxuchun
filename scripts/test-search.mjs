// test-search.mjs · A3 全站搜索 · 核心匹配逻辑单测（零依赖）
// 运行：node scripts/test-search.mjs
// 覆盖：分词 / 中文子串 / 英文 / 混合 AND / 降级 OR / 空结果 / 性能
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const require = createRequire(import.meta.url)

// 加载 search.js（Node 下 DOM 部分自动跳过，仅暴露纯函数）与 search-index.js
require(path.join(ROOT, 'search.js'))
require(path.join(ROOT, 'data', 'search-index.js'))
const S = globalThis.CCOWorkSearch
const IDX = globalThis.SEARCH_INDEX

let pass = 0, fail = 0
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('✅ ' + name) }
  else { fail++; console.error('❌ ' + name + (extra ? ' → ' + extra : '')) }
}
function topUrl(q) {
  const r = S.match(q, IDX, 3)
  return r.map(x => x.item.u)
}

// 1. 分词
const t1 = S.tokenize('DeepSeek 入门')
ok(JSON.stringify(t1) === JSON.stringify(['deepseek', '入门']), '分词: 中英混合', JSON.stringify(t1))
const t2 = S.tokenize('提示词工程')
ok(JSON.stringify(t2) === JSON.stringify(['提示词工程']), '分词: 中文连续短语不拆分', JSON.stringify(t2))
const t3 = S.tokenize('  PID   控制 ')
ok(JSON.stringify(t3) === JSON.stringify(['pid', '控制']), '分词: 空白折叠', JSON.stringify(t3))

// 2. 中文子串匹配
const r1 = topUrl('提示词')
ok(r1.length > 0, '中文子串命中「提示词」', r1.slice(0, 3).join(','))
const r2 = S.match('提示词', IDX)
ok(r2.length > 0 && r2[0].score > 0, '「提示词」结果带分数')
ok(r2[0].fields.length > 0, '「提示词」结果带命中字段', JSON.stringify(r2[0].fields))

// 3. 书名/章节定位（AND 多词）
const r3 = topUrl('DeepSeek 入门')
ok(r3.some(u => u.includes('book/pages/01')), '「DeepSeek 入门」应命中书第01章', r3.slice(0, 5).join(','))

// 4. 实验室
const r4 = topUrl('PID')
ok(r4.some(u => u.startsWith('lab/')), '「PID」应命中实验室', r4.slice(0, 5).join(','))
const r5 = topUrl('仿真')
ok(r5.some(u => u.startsWith('lab/')), '「仿真」应命中实验室', r5.slice(0, 5).join(','))

// 5. 博客（top12 内应出现博客，标题权重低于书/FAQ 属正常排序）
const r6 = S.match('AI 工具', IDX, 12).map(x => x.item.u)
ok(r6.some(u => u.startsWith('blog/')), '「AI 工具」top12 应含博客', r6.slice(0, 5).join(','))

// 6. 空结果
const r7 = S.match('zzz不存在的关键词qqq', IDX)
ok(r7.length === 0, '无匹配返回空')

// 7. 空查询
ok(S.match('', IDX).length === 0 && S.match('   ', IDX).length === 0, '空查询返回空')

// 8. 降级 OR：一词命中
const r8 = topUrl('小白入门 不存在词xyz')
ok(r8.length > 0, '部分命中降级 OR', r8.slice(0, 3).join(','))

// 9. 标题全等优先
const r9 = S.match('AI 实战全书', IDX, 5)
ok(r9.length > 0 && /实战全书/.test(r9[0].item.t), '「AI 实战全书」标题全等优先', r9[0] ? r9[0].item.u : '')

// 10. 性能
const t0 = Date.now()
for (let i = 0; i < 20; i++) S.match('AI', IDX)
const ms = Date.now() - t0
ok(ms < 1000, '性能: 20 次全量检索 < 1s', ms + 'ms')

console.log('\n' + (fail ? '❌ 失败 ' + fail + ' 项' : '🎉 全部通过 ' + pass + ' 项'))
process.exit(fail ? 1 : 0)
