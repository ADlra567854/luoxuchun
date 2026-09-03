// 用 DOM mock 执行 ecosystem.html 脚本，抓运行时错误
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

// 站点根 = 脚本上一级（迁移到 WorkBuddy 后不再硬编码 D 盘旧路径）
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(path.join(ROOT, 'website/ecosystem.html'), 'utf8')
// 提取最后一个内联 <script>（页面主逻辑）
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])
console.log('内联脚本块数:', scripts.length)

// 先加载 embedded.js / knowledge.js 到 window
global.window = {}
eval(readFileSync(path.join(ROOT, 'data/embedded.js'), 'utf8'))
eval(readFileSync(path.join(ROOT, 'data/knowledge.js'), 'utf8'))
const EMBEDDED = window.EMBEDDED
const KNOWLEDGE = window.KNOWLEDGE

function makeEl(id) {
  const el = {
    id, innerHTML: '', textContent: '', value: '', dataset: {}, style: {},
    children: [],
    classList: { _s: new Set(), add(c){ this._s.add(c) }, remove(c){ this._s.delete(c) }, toggle(c){ this._s.has(c)?this._s.delete(c):this._s.add(c) }, contains(c){ return this._s.has(c) } },
    addEventListener(){}, removeEventListener(){},
    querySelectorAll(){ return [] }, querySelector(){ return null },
    appendChild(c){ this.children.push(c); return c },
    scrollIntoView(){}, setAttribute(){}, getAttribute(){ return null },
    offsetWidth: 800, offsetHeight: 46,
  }
  return el
}

const ids = ['layers','modSearch','modGrid','detail','dTitle','dDesc','dRows','dAi','stars']
const elMap = {}
ids.forEach(id => elMap[id] = makeEl(id))
// canvas mock
elMap.stars.getContext = () => ({
  clearRect(){}, beginPath(){}, arc(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, fillRect(){},
  createLinearGradient(){ return { addColorStop(){} } }, fillStyle: '', strokeStyle: '', lineWidth: 0, roundRect(){},
})
elMap.stars.offsetWidth = 800; elMap.stars.offsetHeight = 600
// grid 的 querySelectorAll 需要返回卡片元素（renderMods 里绑定点击）
elMap.modGrid.querySelectorAll = () => []

const documentMock = {
  getElementById(id){ return elMap[id] || makeEl(id) },
  querySelectorAll(){ return [] },
  querySelector(){ return null },
  createElement(){ return makeEl('') },
  addEventListener(){}, removeEventListener(){},
  body: makeEl('body'),
  head: makeEl('head'),
  title: 'test',
}
const locationMock = { href: '', protocol: 'http:', hostname: 'localhost', port: '8787', search: '' }

const sandbox = {
  window, document: documentMock, location: locationMock,
  fetch: () => Promise.reject(new Error('fetch mock fail')),  // 强制走 EMBEDDED 回退
  navigator: { clipboard: { writeText(){ return Promise.resolve() } } },
  localStorage: { getItem(){ return null }, setItem(){} },
  innerWidth: 1200, innerHeight: 800, addEventListener(){}, requestAnimationFrame(){},
  console, setTimeout, clearInterval, setInterval, Promise, Date, Math, encodeURIComponent, decodeURIComponent,
  SpeechSynthesisUtterance: function(){}, speechSynthesis: {},
}
sandbox.window = sandbox
sandbox.window.EMBEDDED = EMBEDDED
sandbox.window.KNOWLEDGE = KNOWLEDGE
sandbox.window.NEWS = []
sandbox.window.addEventListener = function(){}

try {
  vm.createContext(sandbox)
  // 页面内联块依赖外链通用库：真实加载 videokit.js（定义 renderVideoSection，DEPLOY_VIDEOS 缺失时内部兜底 []）
  vm.runInContext(readFileSync(path.join(ROOT, 'assets/videokit.js'), 'utf8'), sandbox, { filename: 'videokit.js' })
  for (let i = 0; i < scripts.length; i++) {
    vm.runInContext(scripts[i], sandbox, { filename: 'ecosystem-script-' + i + '.js' })
  }
  console.log('✅ ecosystem.html 主脚本执行无运行时错误')
  // 验证渲染结果
  const gridHTML = elMap.modGrid.innerHTML
  const cards = (gridHTML.match(/class="mcard/g) || []).length
  console.log('模块卡片渲染数量:', cards)
  if (cards === 0) console.log('❌ 模块卡片为 0！')
} catch (e) {
  console.log('❌ 运行时错误:', e.message)
  console.log('  位置:', e.stack.split('\n').slice(0, 3).join('\n  '))
}
