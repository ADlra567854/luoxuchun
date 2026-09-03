/**
 * 品牌标识 渲染/导出器
 * 用法: node scripts/brand-render.mjs [--preview]
 *   --preview 仅输出 .tmp/preview-*.png 供字形预览校验
 * 依赖: playwright（NODE_PATH 指向 workspace/node_modules）
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VEC = join(ROOT, 'assets', 'brand', 'vector');
const EXP = join(ROOT, 'assets', 'brand', 'export');
const TM = join(ROOT, 'assets', 'brand', 'trademark');
const TMP = join(ROOT, '.tmp');
for (const d of [EXP, TM, TMP]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const PREVIEW = process.argv.includes('--preview');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

  /** 把 SVG 文件按指定边长渲染成 PNG buffer */
  async function render(svgFile, size, { bg = null, color = null } = {}) {
    let svg = readFileSync(join(VEC, svgFile), 'utf8');
    svg = svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`);
    let wrapCss = 'margin:0;padding:0;';
    if (bg) wrapCss += `background:${bg};`;
    if (color) svg = svg.replace('<svg', `<svg style="color:${color}"`);
    const html = `<!doctype html><html><body style="${wrapCss}">${svg}</body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
    const el = await page.$('svg');
    return await el.screenshot({ omitBackground: !bg });
  }

  if (PREVIEW) {
    // 校验用：几种形态都渲染一份，供 ASCII 预览
    const jobs = [
      ['baiju-mark-bw.svg', 512, { bg: '#FFFFFF' }, 'preview-bw.png'],
      ['baiju-mark-color.svg', 512, {}, 'preview-color.png'],
      ['baiju-mark-mono.svg', 512, { bg: '#101728', color: '#38E1FF' }, 'preview-mono.png'],
      ['baiju-mark-small.svg', 512, { bg: '#FFFFFF', color: '#000000' }, 'preview-small.png'],
    ];
    for (const [f, s, opt, out] of jobs) {
      const buf = await render(f, s, opt);
      writeFileSync(join(TMP, out), buf);
      console.log('preview ->', out);
    }
    await browser.close();
    return;
  }

  /* ================= 正式导出 ================= */

  // 1. 商标申请图样：1000x1000 JPG（商标局要求 400x400~1500x1500）
  //    注：JPG 由下游 Python 压缩到 <200KB
  const tmJobs = [
    ['baiju-mark-bw.svg', 1000, { bg: '#FFFFFF' }, 'tm-black-1000.png'],
    ['baiju-mark-color.svg', 1000, { bg: '#FFFFFF' }, 'tm-color-1000.png'],
    ['baiju-mark-mono.svg', 1000, { bg: '#101728', color: '#FFFFFF' }, 'tm-white-1000.png'],
  ];
  for (const [f, s, opt, out] of tmJobs) {
    writeFileSync(join(TM, out), await render(f, s, opt));
    console.log('trademark ->', out);
  }

  // 2. favicon / 站点图标（用简化版，保证 16px 可识别）
  const expJobs = [
    ['baiju-mark-small.svg', 16, { color: '#5B8CFF' }, 'favicon-16.png'],
    ['baiju-mark-small.svg', 32, { color: '#5B8CFF' }, 'favicon-32.png'],
    ['baiju-mark-small.svg', 48, { color: '#5B8CFF' }, 'favicon-48.png'],
    ['baiju-mark-color.svg', 180, {}, 'apple-touch-icon.png'],
    ['baiju-mark-color.svg', 192, {}, 'icon-192.png'],
    ['baiju-mark-color.svg', 512, {}, 'icon-512.png'],
    ['baiju-mark-color.svg', 1024, {}, 'brand-master.png'],
  ];
  for (const [f, s, opt, out] of expJobs) {
    writeFileSync(join(EXP, out), await render(f, s, opt));
    console.log('export ->', out);
  }

  await browser.close();
  console.log('done.');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
