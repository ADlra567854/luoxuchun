/* ============================================================
   全站按钮图标化：把按钮里的 emoji / 字符符号 / 纯文字
   统一换成矢量化 SVG 图标（<i class="cc-ic" data-ic="x">）
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIR = new Set(['deploy', 'node_modules', '.tmp', '.git', 'assets',
  '_archive', '_internal', 'templates', '.workbuddy']);
const DRY = process.argv.includes('--dry');

/* ---------- 1. 符号 / emoji 映射（这些字符直接换成图标） ---------- */
const SYMBOL_MAP = {
  '\u2192': 'arrow-right',   // →
  '\u2190': 'arrow-left',    // ←
  '\u2191': 'arrow-up',      // ↑
  '\u2193': 'arrow-down',    // ↓
  '\u25B6': 'play',          // ▶
  '\u25C0': 'play',          // ◀ (翻转语义，用 chevron-left 更准)
  '\u25C4': 'chevron-left',  // ◀
  '\u25BA': 'chevron-right', // ▶ 小三角
  '\u25BE': 'chevron-down',  // ▾
  '\u25B4': 'chevron-up',    // ▴
  '\u2039': 'chevron-left',  // ‹
  '\u203A': 'chevron-right', // ›
  '\u00AB': 'chevron-left',  // «
  '\u00BB': 'chevron-right', // »
  '\u2795': 'plus',          // ➕
  '\uFF0B': 'plus',          // ＋ 全角加号
  '\u2796': 'minus',         // ➖
  '\u2713': 'check',         // ✓
  '\u2714': 'check',         // ✔
  '\u2715': 'x',             // ✕
  '\u2716': 'x',             // ✖
  '\u00D7': 'x',             // ×
  '\u2B50': 'star',          // ⭐
  '\u2605': 'star',          // ★
  '\u2606': 'star',          // ☆
  '\u2764': 'heart',         // ❤
  '\u2665': 'heart',         // ♥
  '\u2699': 'settings',      // ⚙
  '\u26A1': 'zap',           // ⚡
  '\u231B': 'hourglass',     // ⌛
  '\u23F3': 'hourglass',     // ⏳
  '\U0001F319': 'moon',      // 🌙
  '\U0001F31E': 'sun',       // 🌞
  '\U0001F31F': 'star',      // 🌟
  '\U0001F680': 'rocket',    // 🚀
  '\U0001F4CB': 'clipboard', // 📋
  '\U0001F4CE': 'paperclip', // 📎
  '\U0001F50D': 'search',    // 🔍
  '\U0001F4E5': 'download',  // 📥
  '\U0001F4E6': 'package',   // 📦
  '\U0001F517': 'link',      // 🔗
  '\u270F': 'pencil',        // ✏
  '\u2712': 'pencil',        // ✒
};

/* emoji 及变体选择符的正则（用于检测与清理） */
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
const SYMBOL_RE = new RegExp(
  '[' + Object.keys(SYMBOL_MAP).map(c => '\\u{' + c.codePointAt(0).toString(16) + '}').join('') + ']',
  'gu'
);

/* ---------- 2. 按钮文案 → 图标映射（精确优先，关键词兜底） ---------- */
const EXACT = {
  '复制': 'copy', '拷贝': 'copy', '复制代码': 'copy', '复制链接': 'link',
  '运行': 'play', '执行': 'play', '开始': 'play', '播放': 'play', '暂停': 'pause',
  '发送': 'send', '提交': 'send', '提问': 'send',
  '清空': 'eraser', '清除': 'eraser', '重置': 'rotate-ccw', '刷新': 'refresh-cw',
  '取消': 'x', '关闭': 'x', '退出': 'log-out',
  '保存': 'save', '收藏': 'star', '已收藏': 'star',
  '开始对话': 'message-circle', '继续对话': 'message-circle', '新会话': 'plus',
  '查询': 'search', '查找': 'search', '搜索': 'search', '搜一搜': 'search',
  '添加记事': 'plus', '新建': 'plus', '添加': 'plus', '新增': 'plus',
  '默认视图': 'layout-grid', '默认': 'rotate-ccw', '简约': 'minimize-2',
  '继续学习': 'book-open', '开始学习': 'graduation-cap',
  '返回白驹主站': 'home', '白驹总站': 'home', '返回门户首页': 'home',
  '返回首页': 'home', '回到首页': 'home',
  '看政策': 'file-text', '看案例数据': 'bar-chart-3', '拿提示词': 'terminal',
  '看就业数据': 'trending-up', '高危 vs 新职能': 'git-compare', '拿求职提示词': 'terminal',
  '看真实典范案例': 'award', '致敬前辈': 'heart', '看大事记': 'calendar',
  '开始探索': 'compass', '查看四大作品': 'grid-2x2', '阅读全部中国科技故事': 'book-open',
  '开发者基地': 'code', '三步开箱': 'package-open', '去 chat 对话': 'message-square',
  '看市场数据': 'trending-up', '看 8 步流程': 'list-ordered', '看收入拆解': 'pie-chart',
  '收藏优先': 'star', '最近访问': 'clock',
  '上一章': 'chevron-left', '下一章': 'chevron-right',
  '上一步': 'arrow-left', '下一步': 'arrow-right',
  '从阶段 0 开始': 'rocket', '查看 3 个月速成计划': 'calendar-clock',
  '去地图指引': 'map', '展开全部': 'chevrons-down', '收起全部': 'chevrons-up',
  '全部展开': 'unfold-vertical', '全部收起': 'unfold-vertical',
  '进入白驹总站（主站）': 'arrow-right', '进入白驹总站': 'arrow-right',
  '下载': 'download', '导出': 'download', '上传': 'upload',
  '分享': 'share-2', '打印': 'printer', '设置': 'settings',
  '编辑': 'edit', '修改': 'edit', '删除': 'trash-2',
  '更多': 'chevron-right', '详情': 'arrow-right', '查看': 'eye',
  '学': 'graduation-cap', '认识': 'check', '模糊': 'help-circle', '不认识': 'x',
  '简单': 'check', '困难': 'alert-circle',
  '确定': 'check', '确认': 'check', '知道了': 'check',
  '登录': 'log-in', '注册': 'user-plus', '退出登录': 'log-out',
  '播放音频': 'volume-2', '停止': 'square', '朗读': 'volume-2',
};

/* 关键词兜底（顺序敏感，先长后短） */
const FUZZY = [
  [/复制|拷贝|copy/i, 'copy'],
  [/运行|执行|试一试|跑一下|play/i, 'play'],
  [/发送|submit|send/i, 'send'],
  [/清空|清除|clear/i, 'eraser'],
  [/保存|save/i, 'save'],
  [/下载|导出|download/i, 'download'],
  [/上传|upload/i, 'upload'],
  [/分享|转发|share/i, 'share-2'],
  [/打印|print/i, 'printer'],
  [/设置|设置项|setting/i, 'settings'],
  [/搜索|查询|查找|search/i, 'search'],
  [/删除|移除|remove|delete/i, 'trash-2'],
  [/编辑|修改|edit/i, 'edit'],
  [/关闭|取消|退出|close|cancel/i, 'x'],
  [/收藏|星标|favorite/i, 'star'],
  [/刷新|重新|重置|refresh|reset/i, 'refresh-cw'],
  [/展开|展开全部|expand/i, 'chevrons-down'],
  [/收起|折叠|collapse/i, 'chevrons-up'],
  [/上一|上一步|prev/i, 'arrow-left'],
  [/下一|下一步|next/i, 'arrow-right'],
  [/返回|回到|back/i, 'arrow-left'],
  [/首页|主站|home/i, 'home'],
  [/添加|新增|新建|创建|plus|add/i, 'plus'],
  [/对话|聊天|chat/i, 'message-circle'],
  [/学习|课程|教程|course/i, 'graduation-cap'],
  [/数据|统计|趋势|chart|data/i, 'bar-chart-3'],
  [/提示词|prompt/i, 'terminal'],
  [/案例|范例|示例|example/i, 'award'],
  [/流程|步骤|step/i, 'list-ordered'],
  [/地图|导航|map/i, 'map'],
  [/代码|开发|code/i, 'code'],
  [/更多|详情|查看|了解|more/i, 'arrow-right'],
  [/确定|确认|知道了|ok/i, 'check'],
];

/* ---------- 3. 图标名合法性校验（必须在 assets/icons 存在） ---------- */
const ICON_SET = new Set(
  readdirSync('assets/icons').filter(f => f.endsWith('.svg')).map(f => f.replace(/\.svg$/, ''))
);
const FALLBACK = 'chevron-right';
const safeIcon = n => (n && ICON_SET.has(n) ? n : (ICON_SET.has(FALLBACK) ? FALLBACK : null));

/* ---------- 4. 按钮识别 ---------- */
const BTN_RE = /<(button|a)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
const HAS_ICON = /<svg|cc-ic|cc-mark|data-ic=/i;
const BTN_CLASS = /(\bbtn\b|\bcta\b|button|btn-|-btn)/i;

function pickIcon(text) {
  const t = text.trim();
  if (!t) return null;
  if (EXACT[t]) return EXACT[t];
  // 去括号数字，如「全部（100）」
  const bare = t.replace(/[（(]\s*\d+\s*[）)]/g, '').trim();
  if (EXACT[bare]) return EXACT[bare];
  for (const [re, ic] of FUZZY) if (re.test(t)) return ic;
  return null;
}

/* ---------- 5. 遍历处理 ---------- */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name) || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

let fileCount = 0, hitCount = 0, symCount = 0;
const stats = {};

for (const file of walk(ROOT)) {
  let src = readFileSync(file, 'utf8');

  /* 保护 script / style，避免误抓 JS 里拼的模板字符串 */
  const blocks = [];
  const guarded = src
    .replace(/<script[\s\S]*?<\/script>/gi, m => { blocks.push(m); return '@@BLK' + (blocks.length - 1) + '@@'; })
    .replace(/<style[\s\S]*?<\/style>/gi, m => { blocks.push(m); return '@@BLK' + (blocks.length - 1) + '@@'; });

  let changed = false;
  const out = guarded.replace(BTN_RE, (full, tag, attrs = '', inner) => {
    const isAnchor = tag.toLowerCase() === 'a';
    const cls = (attrs.match(/class\s*=\s*"([^"]*)"/i) || [, ''])[1];
    if (isAnchor && !BTN_CLASS.test(cls)) return full;      // 普通链接不是按钮
    if (HAS_ICON.test(inner)) return full;                   // 已有矢量图标
    if (/@@BLK\d+@@/.test(inner)) return full;

    const rawText = inner.replace(/<[^>]*>/g, '');
    const cleanText = rawText.replace(EMOJI_RE, '').replace(SYMBOL_RE, '').trim();
    if (!cleanText && !SIM_hasSymbol(rawText)) return full;

    /* 判定符号位置：开头 / 结尾 */
    const symAtStart = SIM_startSymbol(rawText);
    const symAtEnd = SIM_endSymbol(rawText);

    let icon = null;
    if (symAtStart) icon = SYMBOL_MAP[symAtStart];
    else if (symAtEnd) icon = SYMBOL_MAP[symAtEnd];
    if (!icon) {
      const em = rawText.match(EMOJI_RE);
      if (em && SYMBOL_MAP[em[0]]) icon = SYMBOL_MAP[em[0]];
    }
    if (!icon) icon = pickIcon(cleanText);
    icon = safeIcon(icon);
    if (!icon) return full;

    /* 清理 inner 里的符号与 emoji */
    let newInner = inner
      .replace(EMOJI_RE, '')
      .replace(SYMBOL_RE, '')
      .replace(/^[ \t\u00A0]+/, '');

    const icTag = `<i class="cc-ic" data-ic="${icon}"></i>`;
    newInner = (symAtEnd && !symAtStart)
      ? newInner.replace(/\s*$/, '') + ' ' + icTag
      : icTag + ' ' + newInner.replace(/^\s*/, '');

    changed = true;
    hitCount++;
    if (symAtStart || symAtEnd) symCount++;
    stats[icon] = (stats[icon] || 0) + 1;
    return `<${tag}${attrs}>` + newInner + `</${tag}>`;
  });

  if (!changed) continue;
  fileCount++;
  const restored = out.replace(/@@BLK(\d+)@@/g, (_, i) => blocks[+i]);
  if (!DRY) writeFileSync(file, restored, 'utf8');
}

/* 辅助：检测开头 / 结尾的符号 */
function SIM_hasSymbol(s) { SIM_startSymbol.lastMatch = null; return SYMBOL_RE.test(s) || EMOJI_RE.test(s); }
function SIM_startSymbol(s) {
  const t = s.replace(/^[\s\u00A0]+/, '');
  const m = t.match(SYMBOL_RE) || t.match(EMOJI_RE);
  return m && SYMBOL_MAP[m[0]] ? m[0] : null;
}
function SIM_endSymbol(s) {
  const t = s.replace(/[\s\u00A0]+$/, '');
  const m = t.match(SYMBOL_RE) || t.match(EMOJI_RE);
  if (!m) return null;
  // 只有符号出现在末尾才算尾随
  const idx = t.lastIndexOf(m[0]);
  return (idx >= t.length - m[0].length - 1 && SYMBOL_MAP[m[0]]) ? m[0] : null;
}

console.log(`处理文件 ${fileCount} 个，注入图标 ${hitCount} 处（其中替换符号 ${symCount} 处）`);
console.log('图标使用统计：');
Object.entries(stats).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${k.padEnd(18)} x${v}`));
if (DRY) console.log('\n[DRY RUN] 未写入文件');
