// 第四批：云顶天空主题背景图（白驹主题专用）
// 用豆包 seedream 生成（走本地代理 /api/proxy，Key B）
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMG_DIR = join(ROOT, 'assets', 'img')
const PROXY = 'http://localhost:8787/api/proxy'
const ARK_MEDIA = 'https://ark.cn-beijing.volces.com/api/v3'
const KEY = process.env.ARK_MEDIA_KEY || '' // Key B 从环境变量读取（.env 注入），勿硬编码入库
const MODEL = 'doubao-seedream-5-0-260128'

const JOBS = [
  { file: 'cloud-garden.jpg', prompt: '漂浮在云海之上的空中花园：白色大理石露台与藤蔓花架，彩色气球与蝴蝶，晨光穿透薄云，梦幻治愈的明亮色调，清新蓝白配色，动漫风格，16:9' },
  { file: 'cloud-train.jpg', prompt: '云层中的白色磁悬浮列车穿行在天空轨道上，轨道架设在云海之间，远处是漂浮的岛屿城市，阳光金边，蓝天白云，治愈系明亮画风，动漫风格，16:9' },
  { file: 'cloud-island.jpg', prompt: '漂浮在云端的天空岛屿城市：白色圆顶建筑、灯塔与旋转木马，瀑布从岛边流入云海，彩虹横跨，童话感，明亮梦幻配色，动漫风格，16:9' },
  { file: 'cloud-cafe.jpg', prompt: '云顶悬崖边的玻璃咖啡馆：白色沙发与绿植，窗外是无边云海与日出，咖啡杯冒着热气，温暖金色晨光，明亮治愈，动漫风格，16:9' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function genOne(job, idx) {
  console.log(`[${idx + 1}/${JOBS.length}] 生成 ${job.file} ...`)
  try {
    const res = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: ARK_MEDIA + '/images/generations',
        auth: KEY,
        body: { model: MODEL, prompt: job.prompt, size: '2K', watermark: false, response_format: 'url' },
      }),
    })
    const d = await res.json()
    const url = d && d.data && d.data[0] && (d.data[0].url || d.data[0].b64_json)
    if (!url) throw new Error('未取到图片地址: ' + JSON.stringify(d).slice(0, 200))
    const buf = url.startsWith('http')
      ? Buffer.from(await (await fetch(url)).arrayBuffer())
      : Buffer.from(url, 'base64')
    await writeFile(join(IMG_DIR, job.file), buf)
    console.log(`   ✅ ${job.file} (${(buf.length / 1024).toFixed(0)}KB)`)
  } catch (e) {
    console.error(`   ❌ ${job.file}:`, e.message || e)
  }
  await sleep(800)
}

await mkdir(IMG_DIR, { recursive: true })
for (let i = 0; i < JOBS.length; i++) await genOne(JOBS[i], i)
console.log('完成')
