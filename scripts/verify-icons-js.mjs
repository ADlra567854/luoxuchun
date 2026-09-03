// 全站校验：cc-ic 图标覆盖 + 内联脚本 JS 语法
// 用法：node scripts/verify-icons-js.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules','_archive','_internal','deploy','.git','_corpus','templates','docs','.workbuddy','assets','media']);
// 要扫描的目录/根文件（与 emoji-clear 一致）
const SCAN_DIRS = ['website','lab','linguavista','book','blog','novel','data'];
const ROOT_FILES = ['index.html','404.html','.tmp_chat.html','.tmp_sl.html'];

// 收集 HTML 文件
const htmlFiles = [];
function walk(dir){
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents){
    const p = path.join(dir, e.name);
    if (e.isDirectory()){
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p);
    } else if (e.name.toLowerCase().endsWith('.html')){
      htmlFiles.push(p);
    }
  }
}
for (const d of SCAN_DIRS) walk(path.join(ROOT, d));
for (const f of ROOT_FILES){ const p = path.join(ROOT, f); if (fs.existsSync(p)) htmlFiles.push(p); }

// 读取 CSS 注册表 & SVG 清单
const cssText = (() => {
  // site-redesign.css 是组件层；也可能在其他 css。统一扫描根 css + assets
  const files = [];
  for (const f of fs.readdirSync(ROOT)) {
    if (f.endsWith('.css')) files.push(path.join(ROOT, f));
  }
  return files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
})();
const REG = new Set();
for (const m of cssText.matchAll(/\[data-ic="([a-z0-9-]+)"\]/g)) REG.add(m[1]);

const ICON_SVGS = new Set();
const iconDir = path.join(ROOT, 'assets', 'icons');
if (fs.existsSync(iconDir)) {
  for (const f of fs.readdirSync(iconDir)) if (f.endsWith('.svg')) ICON_SVGS.add(f.replace(/\.svg$/, ''));
}

// 提取 data-ic 用法
const usedIcons = new Map(); // name -> [files]
const usedRe = /data-ic="([a-z0-9-]+)"/g;
// 内联脚本提取
const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const DATA_TYPES = /type="(?:application\/(?:ld\+)?json|importmap|text\/template)"/i;

let missingIcons = 0;
let iconUsage = 0;
const jsErrors = [];
let scriptsChecked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  // 图标
  let m;
  usedRe.lastIndex = 0;
  while ((m = usedRe.exec(html))) {
    iconUsage++;
    const name = m[1];
    if (!usedIcons.has(name)) usedIcons.set(name, []);
    if (usedIcons.get(name).length < 6) usedIcons.get(name).push(path.relative(ROOT, file));
    if (!REG.has(name) || !ICON_SVGS.has(name)) missingIcons++;
  }
  // 脚本
  let s;
  scriptRe.lastIndex = 0;
  let idx = 0;
  while ((s = scriptRe.exec(html))) {
    idx++;
    const attrs = s[1] || '';
    const code = s[2] || '';
    if (DATA_TYPES.test(attrs)) continue; // JSON / importmap / template 不是 JS
    if (code.trim() === '') continue;
    scriptsChecked++;
    try {
      // 用 Function 构造检测语法错误（不执行）
      new Function(code);
    } catch (err) {
      jsErrors.push({ file: path.relative(ROOT, file), script: idx, msg: err.message });
    }
  }
}

// 输出
console.log('=== 扫描范围 ===');
console.log('HTML 文件数 :', htmlFiles.length);
console.log('cc-ic 使用处 :', iconUsage);
console.log('CSS 注册图标 :', REG.size, ' | SVG 文件 :', ICON_SVGS.size);
console.log('缺失/未注册图标引用 :', missingIcons);
console.log('内联脚本校验数 :', scriptsChecked);
console.log('JS 语法错误数 :', jsErrors.length);

if (missingIcons > 0) {
  console.log('\n--- 未注册图标清单（name -> 样例文件）---');
  for (const [name, files] of usedIcons) {
    if (!REG.has(name) || !ICON_SVGS.has(name)) {
      console.log(`  ✗ ${name}  (注册:${REG.has(name)} svg:${ICON_SVGS.has(name)}) <- ${files.slice(0,3).join(', ')}`);
    }
  }
}
if (jsErrors.length > 0) {
  console.log('\n--- JS 语法错误清单 ---');
  for (const e of jsErrors) console.log(`  ✗ ${e.file} #script${e.script}: ${e.msg}`);
}

const ok = missingIcons === 0;
console.log('\n=== 结论 ===');
console.log(ok ? '✅ 全站按钮图标全部矢量注册（cc-ic 覆盖完整）' : '❌ 存在未注册图标，需补图标或 CSS');
process.exit(ok ? 0 : 2);
