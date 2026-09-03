// 用豆包 seedream 生成站内封面图（走本地代理 /api/proxy，Key B）
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
  { file: 'hero-epoch.jpg', prompt: '宏大壮丽的深空图书馆：漂浮在宇宙中的巨型玻璃书殿，金与青色光雾环绕，星光与数据流交织，赛博朋克史诗感，电影级光影，宽幅构图' },
  { file: 'cover-industry.jpg', prompt: '未来智能工厂：机械臂在蓝色光线下精密装配，全息数字孪生投影叠加在产线上，科技蓝金配色，工业4.0质感' },
  { file: 'cover-future.jpg', prompt: '量子计算与太空探索：量子芯片悬浮在星云中，卫星环绕蓝色地球，未来产业全景，深空蓝紫色调' },
  { file: 'cover-engineering.jpg', prompt: '数字孪生机械工程：透明机甲手臂与三维建模网格叠加，工程蓝图全息投影，青色与金色线条' },
  { file: 'cover-research.jpg', prompt: '科研实验室：玻璃仪器与数据可视化光幕，粒子轨迹，学术研究氛围，冷蓝与白金色调' },
  { file: 'cover-growth.jpg', prompt: '青年在知识之光中成长：剪影人物站在发光书塔前，暖金色与青色光带，希望与力量感，扁平插画与光效结合' },
  { file: 'cover-global.jpg', prompt: '地球村与国际视野：发光地球仪被多国文字符号环绕，连接线路成网，深蓝底金色线条' },
  { file: 'cover-book.jpg', prompt: '《AI 实战全书》书稿封面：一本悬浮的发光书籍，书页化为星光数据流，深空背景金青渐变书名装饰' },
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
console.log('全部完成')
