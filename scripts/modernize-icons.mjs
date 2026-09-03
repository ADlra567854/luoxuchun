// 全站 emoji → Lucide 现代图标（CSS mask 方案）
// 用法: node scripts/modernize-icons.mjs [--dry]
// - HTML 文本节点: 组件标签内前缀 emoji → <i class="cc-ic" data-ic="...">
// - 🐎 品牌 → <i class="cc-mark"> 渐变马头
// - 主题按钮 🌙/☀️ → 双图标 span + dataset.deep 联动
// - ★☆ 评分串 → SVG 星星
// - <option> 内 emoji 直接去掉
// - <script> 块内只改主题切换赋值
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');

// ---------- emoji → 图标名映射 ----------
const MAP = {
  '🌙': 'moon', '☀': 'sun',
  '📅': 'calendar', '🗓': 'calendar',
  '⏱': 'timer', '⏳': 'hourglass', '🕘': 'clock', '🕒': 'clock', '🕰': 'clock',
  '★': 'star', '⭐': 'star', '☆': 'star',
  '✅': 'circle-check', '✔': 'check', '✓': 'check', '☑': 'square-check', '☐': 'square',
  '❌': 'circle-x', '✕': 'x', '✗': 'x', '✘': 'x',
  '⚠': 'triangle-alert',
  '🤖': 'bot',
  '📚': 'library-big', '📖': 'book-open', '📘': 'book', '📕': 'book', '📗': 'book', '📙': 'book',
  '📜': 'scroll-text', '🧾': 'receipt', '📑': 'file-text',
  '🎬': 'clapperboard', '🎥': 'video', '📺': 'tv',
  '🎚': 'sliders-horizontal', '🎛': 'sliders-horizontal',
  '🎓': 'graduation-cap',
  '📌': 'pin', '📍': 'map-pin',
  '📝': 'pen-line', '✍': 'pen-line', '✏': 'pencil', '🖌': 'paintbrush',
  '⚡': 'zap', '🔌': 'plug',
  '💬': 'message-circle', '💭': 'message-square', '🗣': 'message-square',
  '🚀': 'rocket', '✈': 'plane', '🚄': 'train-front', '🚌': 'bus', '🚗': 'car',
  '🔥': 'flame', '🌡': 'activity',
  '⚙': 'settings', '🛠': 'wrench', '🔧': 'wrench', '🔨': 'hammer', '🔩': 'wrench',
  '🌐': 'globe', '🌍': 'globe', '🌏': 'globe', '🧭': 'compass',
  '🧠': 'brain', '🧬': 'dna', '⚛': 'atom',
  '📊': 'chart-column', '📈': 'trending-up', '📉': 'trending-down', '💹': 'trending-up',
  '💡': 'lightbulb', '🔮': 'sparkles',
  '💼': 'briefcase', '💰': 'banknote', '💸': 'banknote', '💳': 'credit-card',
  '🔍': 'search', '🔎': 'search',
  '🎨': 'palette', '🖼': 'image',
  '📋': 'clipboard-list', '🗂': 'folder-open', '📁': 'folder', '📂': 'folder-open', '🗃': 'archive', '🗄': 'archive', '📦': 'box', '🗑': 'trash-2',
  '📄': 'file-text', '📃': 'file-text',
  '💻': 'monitor', '🖥': 'monitor', '⌨': 'keyboard', '📱': 'smartphone',
  '📰': 'newspaper', '📢': 'megaphone', '📣': 'megaphone',
  '🗺': 'map',
  '⬇': 'arrow-down', '⬆': 'arrow-up', '➜': 'arrow-right', '➡': 'arrow-right', '⬅': 'arrow-left',
  '👉': 'arrow-right', '👈': 'arrow-left', '👆': 'mouse-pointer', '👇': 'arrow-down', '☝': 'mouse-pointer',
  '🧰': 'wrench',
  '🎙': 'mic', '🎤': 'mic', '🎧': 'headphones', '🔊': 'volume-2',
  '🧩': 'puzzle',
  '🏫': 'school', '🏛': 'landmark', '🏥': 'cross', '🏢': 'building-2', '🏨': 'building-2', '🏪': 'building-2', '🏭': 'building-2',
  '🏠': 'house', '⌂': 'house', '🏘': 'building-2', '🏙': 'building-2',
  '🔗': 'link', '⛓': 'link', '📎': 'paperclip',
  '⏹': 'square', '⏸': 'pause', '▶': 'play',
  '🔬': 'microscope', '🧪': 'flask-conical', '🩺': 'stethoscope', '💉': 'syringe', '💊': 'pill',
  '🏆': 'trophy', '🏅': 'award', '🎖': 'award', '👑': 'crown',
  '🎉': 'party-popper', '🎊': 'party-popper', '✨': 'sparkles', '💫': 'sparkles', '💠': 'gem', '🌟': 'star',
  '🧑': 'user', '👤': 'user', '👥': 'users', '👩': 'user', '👨': 'user', '👧': 'user', '🧔': 'user', '🧕': 'user', '👫': 'users', '💑': 'users',
  '🔄': 'refresh-cw', '🔁': 'refresh-cw', '♻': 'refresh-cw',
  '🛡': 'shield',
  '🛰': 'satellite', '📡': 'satellite',
  '🌱': 'sprout', '🌿': 'leaf',
  '☁': 'cloud', '🌤': 'cloud-sun', '🌦': 'cloud-sun', '🌥': 'cloud', '🌧': 'cloud-rain', '🌨': 'cloud-snow', '⛈': 'cloud-lightning', '🌊': 'waves',
  '❄': 'snowflake',
  '🧹': 'brush',
  '🛍': 'shopping-bag', '🛒': 'shopping-cart',
  '🍽': 'utensils', '☕': 'coffee',
  '🔐': 'lock', '🔒': 'lock', '🔓': 'lock-open', '🔑': 'key',
  '👁': 'eye', '👀': 'eye',
  '🤝': 'handshake',
  '🎮': 'gamepad-2', '🕹': 'gamepad-2',
  '🧮': 'calculator',
  '⌘': 'command',
  '🔢': 'list',
  '🚧': 'traffic-cone',
  '📟': 'terminal',
  '📐': 'ruler', '📏': 'ruler',
  '🧱': 'blocks',
  '⚖': 'scale',
  '💾': 'save',
  '📥': 'download', '📤': 'upload',
  '📧': 'mail', '✉': 'mail',
  '🖨': 'printer',
  '🆔': 'user', '🆕': 'sparkles',
  '🤔': 'circle-help', '❓': 'circle-help', '❔': 'circle-help',
  '✂': 'scissors',
  '⚔': 'swords',
  '(info)': null
};
const DOT = { '🟢': '#22c55e', '🟠': '#f97316', '🟡': '#eab308', '🔴': '#ef4444', '🔵': '#3b82f6' };

// 校验映射的图标文件都存在
const missing = new Set();
for (const v of Object.values(MAP)) if (v && !fs.existsSync('assets/icons/' + v + '.svg')) missing.add(v);
if (missing.size) { console.error('缺少图标文件:', [...missing].join(',')); process.exit(1); }

// ---------- 构建前缀正则（长键优先，FE0F 可选） ----------
const keys = ['🐎', ...Object.keys(MAP), ...Object.keys(DOT)].sort((a, b) => b.length - a.length);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PREFIX_RE = new RegExp('(' + keys.map(esc).join('|') + ')(\uFE0F?)');

const ALLOWED = new Set(['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'summary', 'td', 'th', 'span', 'b', 'strong', 'p', 'label', 'code', 'em', 'div', 'figcaption', 'address', 'time']);
const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);
const SKIPCTX = new Set(['title', 'textarea', 'script', 'style']);
const SPACE = '[\\s\u00a0\u3000]*';

const ic = name => '<i class="cc-ic" data-ic="' + name + '" aria-hidden="true"></i>';
const icDim = '<i class="cc-ic cc-star-dim" data-ic="star" aria-hidden="true"></i>';
const dot = c => '<i class="cc-ic cc-dot" data-ic="circle" style="color:' + c + '" aria-hidden="true"></i>';
const MARK = '<i class="cc-mark" aria-hidden="true"></i>';
const THEME = '<span class="cc-theme-ics" aria-hidden="true"><i class="cc-ic cc-ic-moon" data-ic="moon"></i><i class="cc-ic cc-ic-sun" data-ic="sun"></i></span>';

// 主题切换 JS 赋值 → dataset.deep（3 种全站写法）
const JS_PATTERNS = [
  [/([a-zA-Z_$][\w$]*)\.textContent\s*=\s*next\s*===\s*'deep'\s*\?\s*'☀️'\s*:\s*'🌙'/g, "$1.dataset.deep=(next==='deep')?'1':''"],
  [/([a-zA-Z_$][\w$]*)\.textContent\s*=\s*t\s*===\s*'deep'\s*\?\s*'☀️'\s*:\s*'🌙'/g, "$1.dataset.deep=(t==='deep')?'1':''"],
  [/([a-zA-Z_$][\w$]*)\.textContent\s*=\s*\(([^)]*data-theme[^)]*)\)\s*===\s*'deep'\s*\?\s*'☀️'\s*:\s*'🌙'/g, "$1.dataset.deep=(($2)==='deep')?'1':''"]
];

// ---------- 单文件处理 ----------
function transformHtml(html, stat) {
  // 1) script/style 块切出来保护：script 只改主题切换 JS，style 原样
  const blocks = [];
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, m => {
    blocks.push(m);
    return '\u0000BLK' + (blocks.length - 1) + '\u0000';
  });
  for (let i = 0; i < blocks.length; i++) {
    if (/^<script/i.test(blocks[i])) {
      blocks[i] = blocks[i].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, sm => {
        for (const [re, rep] of JS_PATTERNS) {
          sm = sm.replace(re, (...a) => { stat.js++; return rep.replace(/\$(\d)/g, (_, d) => a[d]); });
        }
        return sm;
      });
    }
  }

  // 2) 纯文本部分 tokenizer（无 script 干扰）
  const parts = [];
  let last = 0;
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const text = html.slice(last, m.index);
    const top = stack[stack.length - 1];
    parts.push(processText(text, top, stat));
    const [, close, name, , selfclose] = m;
    const t = name.toLowerCase();
    if (close) {
      const i = stack.lastIndexOf(t);
      if (i >= 0) stack.length = i;
    } else if (!selfclose && !VOID.has(t)) {
      stack.push(t);
    }
    parts.push(m[0]);
    last = m.index + m[0].length;
  }
  parts.push(html.slice(last));
  html = parts.join('');

  // 3) 放回 script/style 块
  html = html.replace(/\u0000BLK(\d+)\u0000/g, (_, i) => blocks[+i]);
  return html;
}

function processText(text, top, stat) {
  if (!text || !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}★☆]/u.test(text)) return text;
  if (!top || !ALLOWED.has(top)) return text;
  let out = text;
  // 主题按钮：整段只有 🌙/☀️
  const trimmed = out.trim();
  if (/^[🌙☀]\uFE0F?$/u.test(trimmed) && (top === 'button' || top === 'span' || top === 'a')) {
    stat.theme++;
    return out.replace(trimmed, THEME);
  }
  // option 不走这里（ALLOWED 不含 option），但保险再处理
  // 前缀 emoji 循环替换
  let changed = true;
  while (changed) {
    changed = false;
    const pm = out.match(new RegExp('^' + PREFIX_RE.source));
    if (pm) {
      const e = pm[1];
      if (e === '🐎') {
        out = MARK + out.slice(pm[0].length).replace(/^[\s\u00a0\u3000]*/, '');
        stat.brand++;
      } else if (DOT[e]) {
        out = dot(DOT[e]) + out.slice(pm[0].length).replace(/^[\s\u00a0\u3000]*/, '');
        stat.ic++;
      } else if (MAP[e]) {
        out = ic(MAP[e]) + out.slice(pm[0].length).replace(/^[\s\u00a0\u3000]*/, '');
        stat.ic++;
      } else {
        break;
      }
      changed = true;
      // 连续前缀后可能紧跟文本，跳出避免死循环
      if (!new RegExp('^' + PREFIX_RE.source).test(out)) break;
    }
  }
  // ★☆ 评分串（任意位置）
  if (/★|☆/.test(out)) {
    out = out.replace(/★/g, () => { stat.star++; return ic('star'); })
             .replace(/☆/g, () => { stat.star++; return icDim; });
  }
  // 清理替换后紧邻的 FE0F
  out = out.replace(/(<\/i>|<\/span>)\uFE0F/g, '$1');
  return out;
}

// ---------- 主流程 ----------
const files = execSync('find . -name "*.html" -not -path "./node_modules/*" -not -path "./deploy/*" -not -path "./.git/*" -not -path "./_archive/*"')
  .toString().trim().split('\n');

const stat = { files: 0, ic: 0, brand: 0, theme: 0, star: 0, js: 0 };
for (const f of files) {
  let h = fs.readFileSync(f, 'utf8');
  const before = h;
  const s = { ic: 0, brand: 0, theme: 0, star: 0, js: 0 };
  h = transformHtml(h, s);
  if (h !== before) {
    stat.files++;
    for (const k of Object.keys(s)) stat[k] += s[k];
    if (!DRY) fs.writeFileSync(f, h);
  }
}
console.log((DRY ? '[DRY] ' : '') + '改动文件:', stat.files, ' 图标:', stat.ic, ' 品牌:', stat.brand, ' 主题按钮:', stat.theme, ' 星星:', stat.star, ' JS切换:', stat.js);
