/* 扫描 assets/icons/ 自动补齐 site-redesign.css 里的 .cc-ic 注册规则 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const CSS = 'site-redesign.css';
let css = readFileSync(CSS, 'utf8');

const names = readdirSync('assets/icons')
  .filter(f => f.endsWith('.svg'))
  .map(f => f.replace(/\.svg$/, ''))
  .sort();

const reg = new Set(
  [...css.matchAll(/\.cc-ic\[data-ic="([^"]+)"\]/g)].map(m => m[1])
);

const missing = names.filter(n => !reg.has(n));
if (!missing.length) {
  console.log('图标注册表已是最新（' + reg.size + ' 条）');
} else {
  const block = missing
    .map(n => `.cc-ic[data-ic="${n}"]{--cc-ic:url("assets/icons/${n}.svg")}`)
    .join('\n');
  // 追加到「图标注册表」段末尾（即文件末尾或下一段注释前）
  const anchor = '/* ================= 现代图标系统';
  const idx = css.indexOf(anchor);
  if (idx < 0) {
    css += '\n' + block + '\n';
  } else {
    // 找到该段之后第一个空行后的位置插入：直接放到文件最后更稳妥
    css = css.replace(/\n*$/, '\n' + block + '\n');
  }
  writeFileSync(CSS, css, 'utf8');
  console.log('新增注册规则 ' + missing.length + ' 条 -> ' + CSS);
  console.log(missing.join(' '));
}
