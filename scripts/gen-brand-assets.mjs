import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const BRAND = path.join(ROOT, 'assets', 'brand');
const OUT = path.join(ROOT, 'assets', 'brand');
const SVG = fs.readFileSync(path.join(BRAND, 'baiju-horse.svg'), 'utf8');
const SVG_BLACK = fs.readFileSync(path.join(BRAND, 'baiju-horse-black.svg'), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

async function shotSVG(svg, size, outFile, bg = 'transparent') {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center;}
svg{width:${size}px;height:${size}px;display:block;}
</style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outFile, omitBackground: bg === 'transparent' });
}

async function renderHTML(html, w, h, outFile) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outFile });
}

const sizes = [16, 32, 48, 64, 120, 152, 180, 192, 512];
for (const s of sizes) {
  await shotSVG(SVG, s, path.join(OUT, `baiju-horse-${s}.png`), 'transparent');
}
await shotSVG(SVG_BLACK, 512, path.join(OUT, 'baiju-horse-black-512.png'), 'white');

// Apple touch icon: 深底圆角
const appleHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;box-sizing:border-box}
body{width:180px;height:180px;background:#05070E;border-radius:38px;display:flex;align-items:center;justify-content:center;}
img{width:152px;height:152px;}
</style></head><body><img src="data:image/svg+xml;base64,${Buffer.from(SVG).toString('base64')}"></body></html>`;
await renderHTML(appleHTML, 180, 180, path.join(ROOT, 'apple-touch-icon.png'));

// OG image 1200x630
const ogHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:linear-gradient(135deg,#05070E 0%,#0a0f1d 55%,#101728 100%);display:flex;align-items:center;justify-content:center;gap:48px;font-family:system-ui,PingFang SC,Microsoft YaHei,sans-serif;}
.mark{width:280px;height:280px;}
.text{max-width:700px;color:#eaf1fc;}
h1{font-size:74px;font-weight:900;line-height:1.1;margin:0 0 24px;background:linear-gradient(120deg,#5eead4,#38e1ff 45%,#5b8cff 75%,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;}
p{font-size:38px;color:#8fa3bd;margin:0 0 16px;}
.tag{display:inline-block;padding:10px 24px;border-radius:99px;background:rgba(56,225,255,.10);border:1px solid rgba(56,225,255,.35);color:#38e1ff;font-size:24px;}
</style></head><body>
<img class="mark" src="data:image/svg+xml;base64,${Buffer.from(SVG).toString('base64')}">
<div class="text"><h1>白驹 · ccowork</h1><p>把散落的 AI 工具装进一个大脑</p><span class="tag">全局大脑 · 本地优先 · 开箱即用</span></div>
</body></html>`;
await renderHTML(ogHTML, 1200, 630, path.join(ROOT, 'og-image.png'));

await browser.close();

if (errors.length) {
  console.error('Errors during rendering:', errors);
  process.exit(1);
}
console.log('Brand PNG assets generated.');
