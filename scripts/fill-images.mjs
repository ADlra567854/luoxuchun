// 全站缺图页面补图流水线 —— 智谱 cogview-3-flash（免费）
// 用法: node scripts/fill-images.mjs [批次: all|core|book|lab|rest] [并发数]
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, dirname, relative, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const COVER_DIR = join(ROOT, 'assets', 'covers')
const OUT_DIR = join(ROOT, 'assets', 'pg')
const SCAN = join(ROOT, 'scripts', '_image-scan.json')
const API = 'https://open.bigmodel.cn/api/paas/v4/images/generations'
const MODEL = 'cogview-3-flash'

const env = Object.fromEntries(
  (await readFile(join(ROOT, '.env'), 'utf8')).split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const KEY = env.ZHIPU_API_KEY
if (!KEY) { console.error('❌ 缺 ZHIPU_API_KEY'); process.exit(1) }

// ---------- 敏感词 → 安全抽象主题（智谱内容过滤会拦截地图/政治人物等） ----------
const SAFE_REWRITE = [
  [/钱学森|袁隆平|两弹一星|航天|导弹|核|军|国旗|国徽|领导人|主席|政府|党|台湾|香港|澳门|西藏|新疆/g, '科技先驱与探索精神'],
  [/中国|国产|中华|民族/g, '东方科技创新'],
  [/华为|比亚迪|大疆|5G|北斗|高铁|光刻机|芯片|移动支付|量子|超级计算机|探月|嫦娥/g, '现代科技工业'],
  [/地图|版图|领土/g, '全球数字网络'],
]

// ---------- 主题词库：按路径/标题关键词映射视觉概念 ----------
const THEMES = [
  { re: /ai-academy\/projects|projects\//i, c: 'AI 项目实战工作台：代码面板、流程图与数据仪表盘' },
  { re: /ai-academy|chapter-\d+/i, c: 'AI 知识课堂：抽象神经网络与知识图谱' },
  { re: /五卷全书\/中国科技故事/i, c: '科技创新史：齿轮、火箭与电路板构成的抽象装置' },
  { re: /五卷全书|book\/pages|AI实战全书/i, c: '知识书籍：打开的立体书与漂浮的知识卡片' },
  { re: /blog|本周AI大事记|爆款/i, c: '科技资讯：抽象信息流与新闻卡片' },
  { re: /linguavista|languages|语言/i, c: '多语言学习：世界文字与声波交织的抽象图案' },
  { re: /lab\/simulation|lab\/ml|lab\/numerical|lab\/algorithms/i, c: '科学仿真：数学曲线、粒子与网格空间' },
  { re: /lab\/cnc|lab\/modeling|lab\/programming|lab\/cicd|lab\//i, c: '工程实验室：精密机械结构与代码流' },
  { re: /novel|小说/i, c: '叙事文学：漂浮的书页与故事光点' },
  { re: /prompt|提示词/i, c: '提示词工程：对话气泡与结构化模板' },
  { re: /tool|工具/i, c: 'AI 工具箱：排列整齐的工具图标与模块' },
  { re: /video|视频/i, c: '视频创作：分镜画面与胶片时间轴' },
  { re: /image|绘画|绘图|绘图/i, c: 'AI 绘画：画笔与色彩粒子' },
  { re: /music|音乐|音频/i, c: 'AI 音乐：声波与音符光带' },
  { re: /money|变现|创业|business|biz/i, c: '商业变现：增长曲线与金币图表' },
  { re: /index|目录|README/i, c: '内容索引：排列整齐的卡片矩阵' },
]

const STYLE = '现代扁平插画风格，几何抽象构图，蓝紫渐变主色（#4f8cff→#8b5cf6）配青色点缀，柔和光晕，高清细腻，无文字无水印'

function makePrompt(title, file) {
  let t = (title || '').replace(/·.*$/, '').replace(/\s*\|\s*.*$/, '').trim()
  let concept = ''
  for (const { re, c } of THEMES) { if (re.test(file)) { concept = c; break } }
  // 标题可能触发过滤 → 只取安全片段
  let safeTitle = t
  for (const [re, rep] of SAFE_REWRITE) safeTitle = safeTitle.replace(re, rep)
  // 标题过长/含特殊字符则只用主题概念
  const useTitle = safeTitle.length > 2 && safeTitle.length < 24 && !/[^\u4e00-\u9fa5a-zA-Z0-9\s·—\-]/.test(safeTitle)
  const head = useTitle ? `「${safeTitle}」主题概念图，${concept}` : concept || 'AI 科技主题概念图'
  return `${head}。${STYLE}`
}

function slugFor(file) {
  const s = file.replace(/\.html$/, '').replace(/[\\/]+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').slice(-70)
  return 'pg-' + s + '.png'
}

async function genImage(prompt, hint = '', retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, prompt, size: '1024x1024' }),
      })
      const d = await res.json()
      if (d.error) {
        const code = String(d.error.code || '')
        // 1302 速率限制：免费额度 QPS 很低，需要长退避
        if (code === '1302' && i < retries) {
          const wait = 20000 * (i + 1)
          console.log(`     ⏳ 限速，等待 ${wait / 1000}s 后重试 ${hint}`)
          await new Promise((r) => setTimeout(r, wait))
          continue
        }
        throw new Error(code + ' ' + String(d.error.message || '').slice(0, 120))
      }
      const url = d?.data?.[0]?.url
      if (!url) throw new Error('无 url: ' + JSON.stringify(d).slice(0, 160))
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
      if (buf.length < 5000) throw new Error('图片过小 ' + buf.length)
      return buf
    } catch (e) {
      if (i === retries) throw e
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
}

function injectFigure(html, relSrc, alt) {
  if (/class="[^"]*cc-pg-cover/.test(html)) return null
  const fig = `<figure class="cc-pg-cover" style="margin:0 0 22px;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.10);background:linear-gradient(120deg,#4f8cff22,#8b5cf622);"><img src="${relSrc}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" style="display:block;width:100%;height:clamp(180px,32vw,340px);object-fit:cover;"></figure>\n`
  let m = html.match(/<article[^>]*>/i)
  if (m) return html.replace(m[0], m[0] + '\n' + fig)
  m = html.match(/<main[^>]*>/i)
  if (m) return html.replace(m[0], m[0] + '\n' + fig)
  m = html.match(/<body[^>]*>/i)
  if (m) return html.replace(m[0], m[0] + '\n' + fig)
  return null
}

// ---------- 主流程 ----------
const BATCH = process.argv[2] || 'all'
const CONC = Number(process.argv[3] || 6)
const scan = JSON.parse(await readFile(SCAN, 'utf8'))
let list = scan.noImgPages

const pick = {
  all: () => list,
  core: () => list.filter((r) => /^website\/(?!book\/pages)/.test(r.file) || /^blog\//.test(r.file)),
  academy: () => list.filter((r) => /^website\/(book\/pages|ai-academy)/.test(r.file)),
  book: () => list.filter((r) => /^book\//.test(r.file)),
  rest: () => list.filter((r) => !/^website\//.test(r.file) && !/^book\//.test(r.file) && !/^blog\//.test(r.file)),
}
let jobs = (pick[BATCH] || pick.all)()
const LIMIT = Number(process.env.LIMIT || 0)
if (LIMIT > 0) jobs = jobs.slice(0, LIMIT)
console.log(`批次 [${BATCH}] 待补图页面: ${jobs.length}  并发: ${CONC}`)

await mkdir(OUT_DIR, { recursive: true })

let done = 0, failed = 0, skipped = 0
const fails = []

async function run(rec) {
  const abs = join(ROOT, rec.file)
  const slug = slugFor(rec.file)
  const imgPath = join(OUT_DIR, slug)
  try {
    // 已生成过图片则跳过生图，仅检查注入
    let exists = await stat(imgPath).then(() => true).catch(() => false)
    if (!exists) {
      const buf = await genImage(makePrompt(rec.title, rec.file), rec.file.slice(-28))
      await writeFile(imgPath, buf)
    }
    await new Promise((r) => setTimeout(r, 2500)) // 免费额度限速保护
    let html = await readFile(abs, 'utf8')
    const relSrc = relative(dirname(abs), imgPath).replace(/\\/g, '/')
    const out = injectFigure(html, relSrc, rec.title || basename(rec.file))
    if (out === null) { skipped++; console.log(`  ⏭ ${rec.file} (已注入过)`); return }
    await writeFile(abs, out, 'utf8')
    done++
    console.log(`  ✅ [${done + skipped}/${jobs.length}] ${rec.file}`)
  } catch (e) {
    failed++
    fails.push({ file: rec.file, err: String(e.message || e).slice(0, 120) })
    console.error(`  ❌ ${rec.file}: ${String(e.message || e).slice(0, 100)}`)
  }
}

const queue = [...jobs]
const workers = Array.from({ length: Math.min(CONC, queue.length) }, async () => {
  while (queue.length) { const r = queue.shift(); if (r) await run(r) }
})
await Promise.all(workers)

console.log(`\n=== 完成 ===\n成功注入: ${done}  跳过(已有): ${skipped}  失败: ${failed}`)
if (fails.length) {
  console.log('失败明细:')
  for (const f of fails) console.log(`  - ${f.file}: ${f.err}`)
  await writeFile(join(ROOT, 'scripts', `_fill-fails-${BATCH}.json`), JSON.stringify(fails, null, 2), 'utf8')
}
