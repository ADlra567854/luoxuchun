// 第三批：云顶天空主题背景板 + 深空补充（豆包 seedream）
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
  { file: 'cloud-hero.jpg', prompt: '云顶天空之城：阳光穿透云海，金色霞光中的天空浮岛与白色神殿，云朵洁白蓬松，梦幻治愈，宫崎骏风格，明亮通透' },
  { file: 'cloud-library.jpg', prompt: '云顶图书馆：漂浮在云海之上的玻璃穹顶图书馆，暖白金色调，书柜与阳光，梦幻云顶主题' },
  { file: 'cloud-morning.jpg', prompt: '日出云海：粉金霞光洒满云海，群山露出云顶，暖橙与玫瑰金渐变，清晨治愈氛围' },
  { file: 'cloud-night.jpg', prompt: '银河云海：星空银河倒映在云海之上，深蓝与银白，梦幻安静' },
  { file: 'space-nebula.jpg', prompt: '深空星云：紫蓝与青色的壮丽星云，恒星诞生，宇宙尘埃光带，史诗感' },
  { file: 'space-city.jpg', prompt: '赛博都市：雨夜中的霓虹未来城市，蓝色与粉色灯光，高架轨道列车，赛博朋克' },
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
console.log('第三批完成')
