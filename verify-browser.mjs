// 真实浏览器验证脚本 —— 用 Playwright/Chromium 经本地 server 验证站点
// 用法: node verify-browser.mjs [相对路径，默认 /website/gallery.html]
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8787';
const target = process.argv[2] || '/website/gallery.html';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
const failed = [];
page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });

try {
  await page.goto(BASE + target, { waitUntil: 'networkidle', timeout: 30000 });
} catch (e) {
  console.error('NAV_FAIL: ' + e.message);
  await browser.close();
  process.exit(2);
}
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const selects = [...document.querySelectorAll('select')].map(s => ({
    id: s.id || s.name || '(no-id)',
    value: s.value,
    options: [...s.options].map(o => o.value || o.text)
  }));
  const buttons = [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim()).filter(Boolean);
  const headings = [...document.querySelectorAll('h1,h2,h3')].map(h => (h.textContent || '').trim()).filter(Boolean);
  return {
    title: document.title,
    url: location.href,
    readyState: document.readyState,
    mediaGenLoaded: typeof window.mediaGen !== 'undefined',
    aiLoaded: typeof window.AI !== 'undefined',
    selects,
    buttonCount: buttons.length,
    buttons: buttons.slice(0, 20),
    headings
  };
});

await page.screenshot({ path: 'verify-shot.png', fullPage: true });
console.log(JSON.stringify({ info, errors, failed }, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
