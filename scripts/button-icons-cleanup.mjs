/* 全站 UI 元素符号清理：button / a.btn / span.pill / .chip / .tag / .badge 内的
   emoji 与字符符号统一换成 cc-ic 矢量图标（已有图标的只清符号） */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIR = new Set(['deploy', 'node_modules', '.tmp', '.git', 'assets',
  '_archive', '_internal', 'templates', '.workbuddy']);

const SYMBOLS = {
  '\u2192': 'arrow-right', '\u2190': 'arrow-left', '\u2191': 'arrow-up', '\u2193': 'arrow-down',
  '\u25B6': 'play', '\u25C0': 'play', '\u25C4': 'chevron-left', '\u25BA': 'chevron-right',
  '\u25BE': 'chevron-down', '\u25B4': 'chevron-up',
  '\u2039': 'chevron-left', '\u203A': 'chevron-right',
  '\u00AB': 'chevron-left', '\u00BB': 'chevron-right',
  '\u2795': 'plus', '\uFF0B': 'plus', '\u2796': 'minus',
  '\u2713': 'check', '\u2714': 'check', '\u2715': 'x', '\u2716': 'x', '\u00D7': 'x',
  '\u2B50': 'star', '\u2605': 'star', '\u2606': 'star',
  '\u2764': 'heart', '\u2665': 'heart',
  '\u2699': 'settings', '\u26A1': 'zap', '\u231B': 'hourglass', '\u23F3': 'hourglass',
  '\U0001F319': 'moon', '\U0001F31E': 'sun', '\U0001F31F': 'star', '\U0001F680': 'rocket',
  '\U0001F4CB': 'clipboard', '\U0001F4CE': 'paperclip', '\U0001F50D': 'search',
  '\U0001F4E5': 'download', '\U0001F4E6': 'package', '\U0001F517': 'link',
  '\u270F': 'pencil', '\u2712': 'pencil', '\u27A4': 'send', '\u23F9': 'square',
};
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
const SYM_RE = new RegExp(
  '[' + Object.keys(SYMBOLS).map(c => '\\u{' + c.codePointAt(0).toString(16) + '}').join('') + ']', 'gu'
);

/* 匹配范围：button / a / span / div（需带 UI class） */
const EL_RE = /<(button|a|span|div)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
const BTN_CLASS = /(\bbtn\b|\bcta\b|button|btn-|-btn|\bpill\b|\bchip\b|\btag\b|\bbadge\b|\bnav\b|\bmenu\b|\bbrand\b|\blink\b|\blinks\b|\bicon\b|\bswitch\b|\btoggle\b|\bopt\b|\bsetting\b|\btheme\b|\bactions\b|\btab\b|\bcrumb\b)/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name) || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

let files = 0, hits = 0, added = 0;
for (const file of walk(ROOT)) {
  let src = readFileSync(file, 'utf8');
  const blocks = [];
  const guarded = src
    .replace(/<script[\s\S]*?<\/script>/gi, m => { blocks.push(m); return '@@B' + (blocks.length - 1) + '@@'; })
    .replace(/<style[\s\S]*?<\/style>/gi, m => { blocks.push(m); return '@@B' + (blocks.length - 1) + '@@'; });

  let changed = false;
  const out = guarded.replace(EL_RE, (full, tag, attrs = '', inner) => {
    const cls = (attrs.match(/class\s*=\s*"([^"]*)"/i) || [, ''])[1];
    if (!BTN_CLASS.test(cls)) return full;
    if (/@@B\d+@@/.test(inner)) return full;
    // 只处理叶子节点（内部无子标签块）
    if (/<(button|a|span|div|p|h[1-6]|ul|ol|li|table)\b/i.test(inner)) return full;

    const raw = inner.replace(/<[^>]*>/g, '');
    SYM_RE.lastIndex = 0; EMOJI_RE.lastIndex = 0;
    if (!(SYM_RE.test(raw) || EMOJI_RE.test(raw))) return full;

    const t = raw.replace(/^[\s\u00A0]+/, '');
    const r = raw.replace(/[\s\u00A0]+$/, '');
    SYM_RE.lastIndex = 0; EMOJI_RE.lastIndex = 0;
    const startM = t.match(SYM_RE) || t.match(EMOJI_RE);
    SYM_RE.lastIndex = 0; EMOJI_RE.lastIndex = 0;
    const endM = r.match(SYM_RE) || r.match(EMOJI_RE);

    let icon = null;
    if (startM && SYMBOLS[startM[0]]) icon = SYMBOLS[startM[0]];
    else if (endM && SYMBOLS[endM[0]]) icon = SYMBOLS[endM[0]];

    let newInner = inner
      .replace(EMOJI_RE, '').replace(SYM_RE, '')
      .replace(/[ \t\u00A0]+$/, '').replace(/^[ \t\u00A0]+/, '');
    const hasIcon = /<svg|cc-ic|cc-mark|data-ic=/i.test(inner);

    if (!hasIcon && icon) {
      newInner = newInner.replace(/\s*$/, '') +
        ' <i class="cc-ic" data-ic="' + icon + '" aria-hidden="true"></i>';
      added++;
    }
    hits++; changed = true;
    return `<${tag}${attrs}>` + newInner + `</${tag}>`;
  });

  if (!changed) continue;
  files++;
  writeFileSync(file, out.replace(/@@B(\d+)@@/g, (_, i) => blocks[+i]), 'utf8');
}
console.log(`清理文件 ${files} 个 / 符号 ${hits} 处 / 补图标 ${added} 个`);
