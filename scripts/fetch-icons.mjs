/* 从 Lucide CDN 批量下载 SVG 图标到 assets/icons/ */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'assets/icons';
mkdirSync(DIR, { recursive: true });

const NAMES = [
  'home', 'bar-chart-3', 'git-compare', 'shuffle', 'chevron-up', 'maximize', 'minimize',
  'grid-2x2', 'package-open', 'list-ordered', 'pie-chart', 'rotate-ccw', 'calendar-clock',
  'unfold-vertical', 'chevrons-down', 'chevrons-up', 'help-circle', 'edit', 'alert-circle',
  'check-circle', 'x-circle', 'filter', 'sort-asc', 'maximize-2', 'minimize-2', 'file',
  'power', 'shield-check', 'badge-check', 'languages', 'translate', 'reply', 'forward',
  'log-in', 'log-out', 'panel-left', 'panel-right', 'sticky-note', 'hash', 'ban', 'loader',
  // 备用扩展
  'circle-help', 'chart-bar', 'chart-column', 'house', 'pencil', 'square-pen', 'circle-alert',
  'circle-check', 'circle-x', 'list-filter', 'arrow-up-down', 'file-2', 'badge-check-1',
  'external-link', 'arrow-up-right', 'move-right', 'move-left', 'corner-down-right',
  'circle-play', 'circle-pause', 'list-checks', 'notebook-pen', 'square-chevron-down',
];

const CDN = 'https://unpkg.com/lucide-static@0.469.0/icons/';

let ok = 0, skip = 0, fail = [];

for (const n of NAMES) {
  const out = join(DIR, n + '.svg');
  if (existsSync(out)) { skip++; continue; }
  try {
    const res = await fetch(CDN + n + '.svg', { signal: AbortSignal.timeout(15000) });
    if (!res.ok) { fail.push(n + ':' + res.status); continue; }
    let svg = await res.text();
    // 统一为 currentColor，去掉固定尺寸，保证 mask 可用
    svg = svg
      .replace(/width="[^"]*"/, 'width="24"')
      .replace(/height="[^"]*"/, 'height="24"')
      .replace(/stroke="#[^"]*"/g, 'stroke="currentColor"')
      .replace(/\s+/g, ' ')
      .trim();
    if (!/currentColor/.test(svg)) { fail.push(n + ':no-color'); continue; }
    writeFileSync(out, svg + '\n', 'utf8');
    ok++;
  } catch (e) {
    fail.push(n + ':' + e.message);
  }
}

console.log(`新增 ${ok} / 跳过(已存在) ${skip} / 失败 ${fail.length}`);
if (fail.length) console.log('失败：', fail.join(', '));
