import { chromium } from 'playwright';
const BASE = 'http://localhost:8787';
const browser = await chromium.launch();
const ctx = await browser.newContext({ bypassCSP: true });
const page = await ctx.newPage();
const errors = [], failed = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PE:' + e.message));
page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });

// 加随机 query 绕过浏览器 HTTP 缓存，确保拿到最新 index.html
await page.goto(BASE + '/?v=' + Date.now(), { waitUntil: 'networkidle' });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#q', { timeout: 10000 });

const mode = await page.$eval('#mode', el => el.value);
const hasAI = await page.evaluate(() => typeof window.AI !== 'undefined' && typeof window.AI.complete === 'function');
await page.fill('#q', '祛 AI 味三刀分别是什么？各用一句话说明');
const before = await page.$$eval('#msgs .bot', els => els.length);
await page.click('#send');
let replied = false;
try {
  await page.waitForFunction((b) => {
    const bots = document.querySelectorAll('#msgs .bot');
    const last = bots[bots.length - 1];
    return bots.length > b && last && !last.classList.contains('typing') && last.innerText.trim().length > 20;
  }, before, { timeout: 50000 });
  replied = true;
} catch (e) {}
const full = await page.$eval('#msgs', el => el.innerText);
await page.screenshot({ path: 'verify-baiju.png', fullPage: true });
console.log(JSON.stringify({ mode, hasAI, replied, full: full.slice(0, 800), errors, failed }, null, 2));
await browser.close();
