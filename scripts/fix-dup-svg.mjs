// fix-dup-svg.mjs · 修复 3 篇爆款博客的重复 SVG 头图（删旧「深度长文」版，保留「🔥 爆款生产线」版）
// 用法: node scripts/fix-dup-svg.mjs [--dry]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const dry = process.argv.includes('--dry');

const targets = fs.readdirSync(BLOG).filter(f => f.endsWith('.html') && f.includes('爆款-'));
let fixed = 0, skipped = 0;

for (const name of targets) {
  const fp = path.join(BLOG, name);
  let html = fs.readFileSync(fp, 'utf8');
  const svgRe = /<svg viewBox="0 0 1200 240"[\s\S]*?<\/svg>/g;
  const blocks = html.match(svgRe) || [];
  if (blocks.length < 2) { console.log(`[skip] ${name}: svg=${blocks.length}`); skipped++; continue; }
  // 第一个块若为旧「深度长文」版 → 删除；否则跳过
  const first = blocks[0];
  if (!first.includes('深度长文')) { console.log(`[skip] ${name}: 首块非旧版`); skipped++; continue; }
  const next = html.indexOf(first);
  const end = next + first.length;
  const before = html.slice(0, next);
  const after = html.slice(end).replace(/^\s*\n/, '\n');
  const out = before + after;
  const remain = (out.match(/<svg viewBox="0 0 1200 240"/g) || []).length;
  if (remain !== 1) { console.log(`[FAIL] ${name}: 处理后 svg=${remain}，跳过`); skipped++; continue; }
  if (dry) { console.log(`[dry] ${name}: 将删除旧头图 (${first.length} chars)，保留爆款生产线版`); }
  else { fs.writeFileSync(fp, out, 'utf8'); console.log(`✅ ${name}: 修复完成，剩余 svg=${remain}`); }
  fixed++;
}
console.log(`\n完成: 修复 ${fixed} 篇, 跳过 ${skipped} 篇${dry ? '（dry 模式，未写盘）' : ''}`);
