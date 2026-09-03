/* 修复内容生成脚本里的 UI 模板：主题按钮 emoji -> cc-theme-ics 双图标；导航箭头 -> 矢量图标 */
const fs = require('fs');

/* 站点标准主题切换结构：CSS 按主题自动显隐，JS 无需改内容 */
const THEME_ICS =
  '<span class="cc-theme-ics"><i class="cc-ic cc-ic-moon" data-ic="moon" aria-hidden="true"></i>' +
  '<i class="cc-ic cc-ic-sun" data-ic="sun" aria-hidden="true"></i></span>';

const JOBS = [
  {
    file: 'scripts/gen-academy.mjs',
    reps: [
      // 主题按钮初始态
      [/<button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme\(\)" title="切换主题">[^<]*<\/button>/g,
        '<button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme()" title="切换主题">' + THEME_ICS + '</button>'],
      // 切换函数：去掉 textContent 改内容（改由 CSS 控制显隐），只保留主题切换
      [/if\(b\)b\.textContent=next==='deep'\?'☀️':'🌙';/g, ''],
      [/if\(b\)b\.textContent=t==='deep'\?'☀️':'🌙';/g, ''],
      // 导航箭头
      [/<a href="(\.\.\/)*website\/ai-academy\.html">← 学院首页<\/a>/g,
        '<a href="$1website/ai-academy.html"><i class="cc-ic" data-ic="arrow-left" aria-hidden="true"></i> 学院首页</a>'],
      [/<a href="(\.\.\/)*website\/ai-academy-projects\.html">← 项目库<\/a>/g,
        '<a href="$1website/ai-academy-projects.html"><i class="cc-ic" data-ic="arrow-left" aria-hidden="true"></i> 项目库</a>'],
    ],
  },
  {
    file: 'scripts/gen-weekly.mjs',
    reps: [
      [/'<button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme\(\)" title="切换主题">[^<]*<\/button>\\n'/g,
        '\'<button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme()" title="切换主题">' + THEME_ICS + '</button>\\n\''],
      [/<a href="\.\.\/index\.html">← 返回总览<\/a>/g,
        '<a href="../index.html"><i class="cc-ic" data-ic="arrow-left" aria-hidden="true"></i> 返回总览</a>'],
      [/>📚 博客目录</g,
        '><i class="cc-ic" data-ic="library-big" aria-hidden="true"></i> 博客目录<'],
    ],
  },
  {
    file: 'scripts/opt-academy.mjs',
    reps: [
      [/">← 上一章：/g, '"><i class="cc-ic" data-ic="chevron-left" aria-hidden="true"></i> 上一章：'],
      [/">← 已是第一章</g, '"><i class="cc-ic" data-ic="chevron-left" aria-hidden="true"></i> 已是第一章<'],
      [/下一章：\$\{next\.title\} →</g, '下一章：${next.title} <i class="cc-ic" data-ic="chevron-right" aria-hidden="true"></i><'],
      [/">📚 学院首页/g, '"><i class="cc-ic" data-ic="graduation-cap" aria-hidden="true"></i> 学院首页'],
    ],
  },
  {
    file: 'scripts/gen-viral.mjs',
    reps: [
      [/<a href="index\.html">📚 博客目录<\/a>/g,
        '<a href="index.html"><i class="cc-ic" data-ic="library-big" aria-hidden="true"></i> 博客目录</a>'],
    ],
  },
];

let files = 0, reps = 0;
const miss = [];
for (const job of JOBS) {
  let src;
  try { src = fs.readFileSync(job.file, 'utf8'); } catch (e) { miss.push(job.file + ' 读取失败'); continue; }
  const orig = src;
  for (const [re, to] of job.reps) {
    if (re.test(src)) { const n = (src.match(re) || []).length; src = src.replace(re, to); reps += n; }
    else miss.push(job.file + ' 未匹配: ' + re.source.slice(0, 50));
  }
  if (src === orig) { miss.push(job.file + ' 无改动'); continue; }
  fs.writeFileSync(job.file, src, 'utf8');
  files++;
  console.log('OK  ' + job.file);
}
console.log(`\n处理 ${files} 个文件 / ${reps} 处替换`);
if (miss.length) { console.log('\n需确认：'); miss.forEach(m => console.log('  - ' + m)); }
