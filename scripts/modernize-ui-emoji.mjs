// 把"组件上下文"内的 emoji 替换为统一 SVG 图标（cc-ic）。
// 组件上下文 = button / a / div.icon / .badge / .chip / .tag / .links / nav /
//   .sw(主题开关) / .menu / .brand / .cta / .btn / .toggle / .opt / .setting / .theme / .label / .bar
// 正文叙述里的 emoji 不动。国旗 emoji 保留（语言/国家标识语义）。
import fs from 'node:fs';
import path from 'node:path';

const MAP = {
  '☰': 'menu',
  '🔭': 'telescope',
  '🏗': 'hard-hat',
  '🎯': 'target',
  '⚡': 'zap',
  '☢': 'radiation',
  '📴': 'wifi-off',
  '🧊': 'hard-drive',
  '🐢': 'gauge',
  '🐋': 'cpu',
  '🎵': 'music',
  '🅱': 'tag',
  '🦙': 'bot',
  '👂': 'audio-lines',
  '🕸': 'globe',
  '🤗': 'box',
  '🌪': 'wind',
  '🏟': 'map-pin',
  '🐍': 'code',
  '📕': 'book-open',
  '🌗': 'contrast',
};

const COMP_CLASS = /(^|\s)(icon|badge|chip|tag|links|nav|menu|brand|cta|btn|sw|toggle|opt|setting|theme|label|bar)/;
const isCompTag = (name, cls) =>
  name === 'button' || name === 'a' ||
  COMP_CLASS.test(cls) || (name === 'div' && /icon/.test(cls));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(Object.keys(MAP).map(esc).join('|'), 'gu');

function replaceEmoji(txt) {
  return txt.replace(re, (m) => {
    const name = MAP[m];
    if (!name) return m;
    return '<i class="cc-ic" data-ic="' + name + '"></i>';
  });
}

function processHtml(html) {
  const blocks = [];
  html = html.replace(/<script[\s\S]*?<\/script>/gi, (m) => { blocks.push(m); return '@@B' + (blocks.length - 1) + '@@'; });
  html = html.replace(/<style[\s\S]*?<\/style>/gi, (m) => { blocks.push(m); return '@@B' + (blocks.length - 1) + '@@'; });
  const tokens = html.split(/(<[^>]+>)/g);
  const stack = [];
  const out = [];
  for (const t of tokens) {
    if (t.startsWith('<')) {
      const close = /^<\/\s*([a-zA-Z0-9]+)/.test(t);
      const name = (t.match(/^<\s*\/?\s*([a-zA-Z0-9]+)/) || [])[1];
      const cls = (t.match(/class="([^"]*)"/) || [])[1] || '';
      if (close) { if (stack.length) stack.pop(); }
      else if (isCompTag(name, cls)) { stack.push(true); }
      out.push(t);
    } else {
      out.push(stack.length ? replaceEmoji(t) : t);
    }
  }
  let res = out.join('');
  res = res.replace(/@@B(\d+)@@/g, (_, i) => blocks[+i]);
  res = res.replace(/\uFE0F/g, '');
  return res;
}

const SKIP = new Set(['deploy', 'node_modules', '.tmp', '.git', 'assets', '_archive', 'scripts', '.workbuddy']);
function walk(d, acc) {
  let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const x of e) {
    const p = path.join(d, x.name);
    if (x.isDirectory()) { if (SKIP.has(x.name)) continue; walk(p, acc); }
    else if (x.name.endsWith('.html')) acc.push(p);
  }
}
const files = [];
walk('.', files);
let total = 0, fcount = 0;
for (const f of files) {
  const h0 = fs.readFileSync(f, 'utf8');
  const h1 = processHtml(h0);
  if (h1 !== h0) {
    fs.writeFileSync(f, h1);
    const n = (h0.match(re) || []).length;
    total += n; fcount++;
    console.log(n + '  ' + f.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, ''));
  }
}
console.log('\n处理文件: ' + fcount + '  替换 emoji: ' + total);
