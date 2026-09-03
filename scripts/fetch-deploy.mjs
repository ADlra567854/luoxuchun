// 抓取真实「部署 / 使用 / 连接」教程视频（Bilibili 官方源）
// 仅嵌入官方播放器(player.bilibili.com)，不转存视频文件，标注来源与原文。
// 主题：如何部署/使用/连接 每个 AI 工具与智能体（贴合本网站工具矩阵）。
// 运行：node scripts/fetch-deploy.mjs  ->  写 data/deploy-videos.js

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, '../data/deploy-videos.js');

const HEAD = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://search.bilibili.com',
};

// 类目：映射站点真实工具/智能体，关键词具体不空泛
const TOPICS = [
  { tag: '部署基础',   kw: 'AI 本地部署 教程' },
  { tag: 'DeepSeek',  kw: 'DeepSeek 本地部署 教程' },
  { tag: 'Ollama',    kw: 'Ollama 安装 使用 教程' },
  { tag: 'ComfyUI',   kw: 'ComfyUI 安装 部署 教程' },
  { tag: 'StableDiffusion', kw: 'Stable Diffusion 本地部署' },
  { tag: 'AI智能体',  kw: 'AI 智能体 搭建 教程' },
  { tag: 'Coze智能体', kw: 'Coze 智能体 教程' },
  { tag: 'Dify',      kw: 'Dify 搭建 教程' },
  { tag: '工作站',    kw: 'AI 工作站 搭建' },
  { tag: 'Cursor',    kw: 'Cursor 使用 教程' },
  { tag: '生态收纳',  kw: 'AI 工具 合集 推荐' },
  { tag: 'AI绘画',    kw: 'AI 绘画 教程 即梦' },
  { tag: 'AI视频',    kw: 'AI 视频 制作 教程' },
  { tag: 'AI漫剧',    kw: 'AI 漫剧 制作 教程' },
  { tag: '知识库',    kw: '个人知识库 搭建 AI' },
  { tag: '教育',      kw: 'AI 教育 应用 教学' },
  { tag: '简历',      kw: 'AI 简历 制作 教程' },
  { tag: '语音',      kw: 'AI 语音 克隆 教程' },
  { tag: '安全',      kw: '网络安全 入门 教程' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 轻量重试：瞬时限流/网络抖动时自愈，避免把整批数据打残
async function withRetry(fn, n = 2) {
  let last;
  for (let i = 0; i <= n; i++) {
    try { const r = await fn(); if (r) return r; }
    catch (e) { last = e; }
    await sleep(1200 * (i + 1));
  }
  if (last) console.warn('  ⚠ 重试耗尽:', last.message);
  return null;
}

// 解码 HTML 实体 + 去标签，保证存入的数据干净
const dec = (s = '') => String(s)
  .replace(/<[^>]*>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[k]));

async function search(topic) {
  const url = 'https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&page=1&keyword=' + encodeURIComponent(topic.kw);
  try {
    const r = await fetch(url, { headers: HEAD });
    const j = await r.json();
    if (j.code !== 0) { console.warn(`  ⚠ 搜索「${topic.kw}」返回 code=${j.code}`); return []; }
    return (j.data.result || [])
      .filter(x => x.bvid)
      .slice(0, 8)
      .map(x => ({
        bvid: x.bvid,
        title: dec(x.title),
        desc: dec(x.description || '').slice(0, 110),
        thumb: (x.pic || '').replace(/^\/\//, 'https://').replace(/^http:/, 'https:'),
        date: new Date(((x.pubdate || x.senddate) || 0) * 1000).toISOString().slice(0, 10),
        source: dec(x.author || ''),
        tag: topic.tag,
        watch: 'https://www.bilibili.com/video/' + x.bvid,
        embed: 'https://player.bilibili.com/player.html?bvid=' + x.bvid + '&page=1&high_quality=1&danmaku=0&autoplay=0',
      }));
  } catch (e) {
    console.warn(`  ⚠ 搜索「${topic.kw}」失败: ${e.message}`);
    return [];
  }
}

async function main() {
  const seen = new Set();
  const items = [];
  for (const t of TOPICS) {
    const list = await withRetry(() => search(t)) || [];
    await sleep(400);
    for (const v of list) {
      if (seen.has(v.bvid)) continue;
      seen.add(v.bvid);
      items.push(v);
    }
    console.log(`✓ ${t.tag}：${list.length} 候选`);
  }
  // 每类保底，避免末尾类目被总量截断
  const MAX = 130;
  const byTag = {};
  items.forEach(v => { (byTag[v.tag] ||= []).push(v); });
  const MIN = 4;
  const out = [];
  const rest = [];
  Object.values(byTag).forEach(arr => {
    out.push(...arr.slice(0, MIN));
    rest.push(...arr.slice(MIN));
  });
  rest.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  out.push(...rest.slice(0, Math.max(0, MAX - out.length)));
  out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const today = new Date().toISOString().slice(0, 10);
  const banner = `// 自动抓取 · 真实「部署 / 使用 / 连接」教程视频（Bilibili 官方源）\n// 仅嵌入官方播放器，不转存视频；主题=如何部署/使用/连接 每个 AI 工具与智能体\n// 生成于 ${today}\n`;
  const body = banner + 'window.DEPLOY_VIDEOS = ' + JSON.stringify(out, null, 2) + ';\nwindow.DEPLOY_VIDEOS_UPDATED = ' + JSON.stringify(today) + ';\n';
  // 安全阀：总量不足不写盘，避免把已有好数据覆盖成残的
  if (out.length < 50) {
    console.error(`\n⛔ 仅抓到 ${out.length} 条（疑似被限流/网络异常），已放弃写盘，保留原 data/deploy-videos.js 不变。`);
    process.exit(2);
  }
  writeFileSync(OUT, body, 'utf8');
  console.log(`\n✅ 完成：${out.length} 条真实教程视频 → ${OUT}`);
  console.log('样例：');
  out.slice(0, 6).forEach(v => console.log(`  [${v.tag}] ${v.title}  (${v.source} · ${v.date})`));
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
