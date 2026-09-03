// 抓取真实新闻视频（Bilibili 官方源）
// 仅嵌入官方播放器(player.bilibili.com)，不转存视频文件，标注来源与原文。
// 主题：贴合本网站全部内容板块（AI创作 / 工具模型 / 大学生就业 / 产业商业 / 实战学习），不抓泛世界新闻。
// 运行：node scripts/fetch-news.mjs  ->  写 data/news-video.js

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, '../data/news-video.js');

const HEAD = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://search.bilibili.com',
};

// 主题：映射站点真实内容支柱，关键词具体不空泛
const TOPICS = [
  { tag: 'AI绘画',   kw: 'AI绘画' },
  { tag: 'AI视频',   kw: 'AI视频生成' },
  { tag: 'AI写作',   kw: 'AI写作' },
  { tag: 'AI漫剧',   kw: 'AI漫剧' },
  { tag: 'AI设计',   kw: 'AI设计' },
  { tag: '大模型',   kw: '大模型' },
  { tag: 'DeepSeek', kw: 'DeepSeek' },
  { tag: '本地部署', kw: '本地部署AI' },
  { tag: 'AI智能体', kw: 'AI智能体' },
  { tag: 'AI工具',   kw: 'AI工具推荐' },
  { tag: '大学生就业', kw: '大学生就业' },
  { tag: '秋招校招', kw: '秋招' },
  { tag: '考研',     kw: '考研' },
  { tag: '编程学习', kw: '编程学习' },
  { tag: '大学生创业', kw: '大学生创业' },
  { tag: 'AI创业',   kw: 'AI创业' },
  { tag: 'AI赚钱',   kw: 'AI赚钱' },
  { tag: '科技前沿', kw: '科技前沿' },
  { tag: '中国科技', kw: '中国科技' },
  { tag: '提示词',   kw: '提示词工程' },
  { tag: '数据分析', kw: '数据分析AI' },
  { tag: '自动化办公', kw: '自动化办公' },
  { tag: 'AI防骗',   kw: 'AI防骗' },
  // —— 自学成长线（贴合大学生/转行/自我提升）——
  { tag: '自学编程',   kw: '零基础学编程' },
  { tag: '网络安全',   kw: '网络安全自学' },
  { tag: '软件设计',   kw: '软件设计' },
  { tag: 'UI设计',     kw: 'UI设计' },
  { tag: '自学自动化', kw: '自动化教程' },
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
  // 每类保底，避免末尾类目（自学线）被总量截断
  const MAX = 160;
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
  const banner = `// 自动抓取 · 真实新闻视频（Bilibili 官方源）\n// 仅嵌入官方播放器，不转存视频；主题贴合本网站（AI创作/工具/大学生就业/产业/实战）\n// 生成于 ${today}\n`;
  const body = banner + 'window.NEWS_VIDEO = ' + JSON.stringify(out, null, 2) + ';\nwindow.NEWS_VIDEO_UPDATED = ' + JSON.stringify(today) + ';\n';
  // 安全阀：总量不足不写盘，避免把已有好数据覆盖成残的（限流时放宽到 20 条仍为真实搜索结果）
  if (out.length < 20) {
    console.error(`\n⛔ 仅抓到 ${out.length} 条（疑似被限流/网络异常），已放弃写盘，保留原 data/news-video.js 不变。`);
    process.exit(2);
  }
  writeFileSync(OUT, body, 'utf8');
  console.log(`\n✅ 完成：${out.length} 条真实视频 → ${OUT}`);
  console.log('样例：');
  out.slice(0, 6).forEach(v => console.log(`  [${v.tag}] ${v.title}  (${v.source} · ${v.date})`));
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
