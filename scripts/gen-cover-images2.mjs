// 第二批：书稿章节封面 + 新模块封面（豆包 seedream）
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMG_DIR = join(ROOT, 'assets', 'img')
const PROXY = 'http://localhost:8787/api/proxy'
const ARK_MEDIA = 'https://ark.cn-beijing.volces.com/api/v3'
const KEY = process.env.ARK_MEDIA_KEY || '' // Key B 从环境变量读取（.env 注入），勿硬编码入库
const MODEL = 'doubao-seedream-5-0-260128'

const JOBS = [
  { file: 'cover-ai70.jpg', prompt: 'AI 七十年章节封面：复古真空管与电路板组成的时间年轮，暖金色光效，科技史书籍封面风格' },
  { file: 'cover-deepseek.jpg', prompt: 'DeepSeek 章节封面：深海中发光的巨大黑鲸，头顶星光数据流，深邃蓝黑与青色光，史诗感' },
  { file: 'cover-chatgpt.jpg', prompt: '对话 AI 章节封面：漂浮在星空中的对话气泡星球，两个发光气泡碰撞出火花，蓝紫色调' },
  { file: 'cover-imagegen.jpg', prompt: '图像生成章节封面：像素画布悬浮空中，调色板喷涌出彩色光带，创意迸发感' },
  { file: 'cover-videogen.jpg', prompt: '视频生成章节封面：电影胶片环绕镜头，光线从胶片中射出，动态模糊与光晕，电影感' },
  { file: 'cover-prompts.jpg', prompt: '提示词宝典封面：一本发光的魔法书，书页飘出金色的咒语符号与星光，神秘感' },
  { file: 'cover-design.jpg', prompt: '创意设计模块封面：悬浮的设计画布与工具（笔、色板、屏幕）环绕发光圆环，扁平立体结合' },
  { file: 'cover-data.jpg', prompt: '数据分析模块封面：巨大的数据可视化光幕，柱状图折线图变成光之森林，冷蓝与金色数据点' },
]

async function gen(job) {
  const body = { model: MODEL, prompt: job.prompt, size: '2K', watermark: false, response_format: 'url' }
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: ARK_MEDIA + '/images/generations', body, auth: KEY }),
  })
  const data = await res.json()
  const url = data && data.data && data.data[0] && (data.data[0].url || data.data[0].b64_json)
  if (!url) throw new Error(JSON.stringify(data).slice(0, 200))
  const buf = url.startsWith('data:') ? Buffer.from(url.split(',')[1], 'base64') : Buffer.from(await (await fetch(url)).arrayBuffer())
  await mkdir(IMG_DIR, { recursive: true })
  await writeFile(join(IMG_DIR, job.file), buf)
  console.log('✅', job.file, (buf.length / 1024).toFixed(0) + 'KB')
}

for (const job of JOBS) {
  try { await gen(job) } catch (e) { console.log('❌', job.file, e.message) }
}
console.log('第二批完成')
