/* 统一把运行时 JS 里动态生成的按钮符号 / emoji 换成 cc-ic 矢量图标 */
const fs = require('fs');

const HELPER =
  "\n  // 矢量图标：沿用站点 cc-ic CSS-mask 体系，自动继承文字颜色与字号\n" +
  "  function ic(name) {\n" +
  "    return '<i class=\"cc-ic\" data-ic=\"' + name + '\" aria-hidden=\"true\"></i>'\n" +
  "  }\n";

const JOBS = [
  /* ---------- search.js ---------- */
  {
    file: 'search.js',
    anchor: /  \/\/ ---------- 触发按钮/,
    helper: HELPER,
    reps: [
      [/btn\.innerHTML = '🔍 <span style="font-size:11px;opacity:\.75">搜索<\/span>'/,
        "btn.innerHTML = ic('search') + ' <span style=\"font-size:11px;opacity:.75\">搜索</span>'"],
      [/btn\.innerHTML = '🔍'/, "btn.innerHTML = ic('search')"],
    ],
  },
  /* ---------- responsive.js ---------- */
  {
    file: 'responsive.js',
    anchor: /\(function \(/,
    helper: HELPER,
    reps: [
      [/aria-label="关闭预览">✕<\/button>/,
        "aria-label=\"关闭预览\">' + ic('x') + '</button>'"],
    ],
  },
  /* ---------- module.js ---------- */
  {
    file: 'module.js',
    anchor: /\(function \(/,
    helper: HELPER,
    reps: [
      [/'<button class="cta-btn primary" data-cta="share">分享给需要的人<\/button>'/,
        "'<button class=\"cta-btn primary\" data-cta=\"share\">' + ic('share-2') + ' 分享给需要的人</button>'"],
      [/'<button class="cta-btn" data-cta="copy">复制链接<\/button>'/,
        "'<button class=\"cta-btn\" data-cta=\"copy\">' + ic('link') + ' 复制链接</button>'"],
    ],
  },
  /* ---------- ccowork.js ---------- */
  {
    file: 'ccowork.js',
    anchor: null,
    helper: '',
    reps: [
      [/title="新建会话">\+ 新会话</,
        "title=\"新建会话\"><i class=\"cc-ic\" data-ic=\"plus\" aria-hidden=\"true\"></i> 新会话<"],
      [/<button id="ccowork-chat-send" type="button">发送<\/button>/,
        "<button id=\"ccowork-chat-send\" type=\"button\"><i class=\"cc-ic\" data-ic=\"send\" aria-hidden=\"true\"></i> 发送</button>"],
    ],
  },
  /* ---------- baiju-widget.js ---------- */
  {
    file: 'baiju-widget.js',
    anchor: /\(function \(/,
    helper: HELPER,
    reps: [
      [/fab\.textContent = '🐎'/,
        "fab.innerHTML = '<i class=\"cc-mark\" aria-hidden=\"true\"></i>'"],
      [/'<div id="bj-head"><span>🐎 白驹 · 随时问<\/span><span class="x" id="bj-close">收起<\/span><\/div>'/,
        "'<div id=\"bj-head\"><span>' + ic('horse') + ' 白驹 · 随时问</span>'\n" +
        "    + '<span class=\"x\" id=\"bj-close\">' + ic('chevron-down') + ' 收起</span></div>'"],
      [/<button id="bj-send">发送<\/button>/,
        "'<button id=\"bj-send\">' + ic('send') + ' 发送</button>'"],
    ],
  },
];

let totalFiles = 0, totalReps = 0;
const problems = [];

for (const job of JOBS) {
  let src;
  try { src = fs.readFileSync(job.file, 'utf8'); } catch (e) { problems.push(job.file + ' 读取失败'); continue; }
  const orig = src;

  // 注入 helper（若还没有且提供了 anchor）
  if (job.helper && job.anchor && !/function ic\(/.test(src)) {
    const m = src.match(job.anchor);
    if (m) {
      src = src.replace(job.anchor, job.helper + m[0]);
    } else {
      problems.push(job.file + ' 找不到 helper 注入锚点');
    }
  }

  // 执行替换
  for (const [re, to] of job.reps) {
    if (re.test(src)) { src = src.replace(re, to); totalReps++; }
    else problems.push(job.file + ' 未匹配: ' + re.source.slice(0, 60));
  }

  if (src === orig) { problems.push(job.file + ' 无改动'); continue; }
  fs.writeFileSync(job.file, src, 'utf8');
  totalFiles++;
  console.log('OK  ' + job.file);
}

console.log(`\n处理文件 ${totalFiles} 个 / 替换 ${totalReps} 处`);
if (problems.length) { console.log('\n需要人工确认：'); problems.forEach(p => console.log('  - ' + p)); }
