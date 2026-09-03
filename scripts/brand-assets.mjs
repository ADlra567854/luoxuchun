/**
 * 品牌 · 组合标 / OG 图 生成器
 * ---------------------------------------------------------------
 * 字体安全：强制使用 Noto Sans SC（思源黑体，SIL Open Font License，
 *           允许商用 / 嵌入 / 修改）。严禁使用微软雅黑（商用需方正授权，
 *           用于商标图样存在字体著作权风险）。
 * 产出：
 *   assets/brand/export/lockup-h.png      横版组合标（透明底）
 *   assets/brand/export/lockup-h-dark.png 横版组合标（深底反白）
 *   assets/brand/export/og-image.png      OG 分享卡 1200x630
 *   assets/brand/trademark/tm-word-1000.png 文字标「白驹」1000x1000
 * ---------------------------------------------------------------
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
for (const d of [EXP, TM]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const FONT_STACK = `"Noto Sans SC","Source Han Sans SC","Noto Sans CJK SC",sans-serif`;
const markColor = readFileSync(join(VEC, 'baiju-mark-color.svg'), 'utf8');
const markMono = readFileSync(join(VEC, 'baiju-mark-mono.svg'), 'utf8');

const baseCss = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:${FONT_STACK};-webkit-font-smoothing:antialiased}
  .wrap{display:flex;align-items:center}
  .mark{width:var(--mw);height:var(--mw);flex:0 0 auto;display:block}
  .mark svg{width:100%;height:100%;display:block}
  .txt{display:flex;flex-direction:column;justify-content:center}
  .cn{font-size:var(--cn);font-weight:900;letter-spacing:.06em;line-height:1}
  .en{font-size:var(--en);font-weight:600;letter-spacing:.24em;line-height:1;margin-top:.42em}
`;

function lockupHTML({ w, h, mw, cn, en, sub, bg, fg, subColor, mark, gap }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${baseCss}
    body{width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center}
    .wrap{--mw:${mw}px;gap:${gap}px}
    .cn{--cn:${cn}px;color:${fg}}
    .en{--en:${en}px;color:${subColor}}
  </style></head><body>
    <div class="wrap">
      <span class="mark">${mark}</span>
      <span class="txt">
        <span class="cn">白驹</span>
        ${sub ? `<span class="en">${sub}</span>` : ''}
      </span>
    </div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  async function shot(html, w, h, out, { omitBackground = false } = {}) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(120);
    const buf = await page.screenshot({ omitBackground });
    writeFileSync(join(EXP, out), buf);
    console.log('export ->', out, `(${w}x${h})`);
    return out;
  }

  /** 元素自适应截图：画布紧贴内容，避免出现大片无用留白 */
  async function shotEl(html, out, { omitBackground = false, pad = 40 } = {}) {
    await page.setViewportSize({ width: 1600, height: 800 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const el = await page.$('.wrap');
    const box = await el.boundingBox();
    // 通过 clip 补出 padding（元素截图无法直接加内边距）
    const buf = await page.screenshot({
      omitBackground,
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: Math.min(1600 - Math.max(0, box.x - pad), box.width + pad * 2),
        height: Math.min(800 - Math.max(0, box.y - pad), box.height + pad * 2),
      },
    });
    writeFileSync(join(EXP, out), buf);
    console.log('export ->', out, `(${Math.round(box.width + pad * 2)}x${Math.round(box.height + pad * 2)})`);
    return out;
  }

  /* 1. 横版组合标 · 透明底（浅色场景） */
  await shotEl(
    lockupHTML({
      w: 1600, h: 600, mw: 240, cn: 168, en: 40, sub: 'BAIJU · GLOBAL BRAIN',
      bg: 'transparent', fg: '#0F172A', subColor: '#5B8CFF', mark: markColor, gap: 52,
    }), 'lockup-h.png', { omitBackground: true }
  );

  /* 2. 横版组合标 · 深底反白（深色场景 / 导航） */
  await shotEl(
    lockupHTML({
      w: 1600, h: 600, mw: 240, cn: 168, en: 40, sub: 'BAIJU · GLOBAL BRAIN',
      bg: '#05070E', fg: '#F0F6FF', subColor: '#38E1FF', mark: markColor, gap: 52,
    }), 'lockup-h-dark.png'
  );

  /* 3. 文字标「白驹」1000x1000（商标申请备选：纯文字商标图样） */
  const wordHTML = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}
    body{width:1000px;height:1000px;background:#FFFFFF;display:flex;align-items:center;justify-content:center;font-family:${FONT_STACK}}
    .cn{font-size:520px;font-weight:900;color:#000;letter-spacing:.04em;line-height:1}
  </style></head><body><span class="cn">白驹</span></body></html>`;
  await page.setViewportSize({ width: 1000, height: 1000 });
  await page.setContent(wordHTML, { waitUntil: 'load' });
  await page.waitForTimeout(120);
  writeFileSync(join(TM, 'tm-word-1000.png'), await page.screenshot());
  console.log('trademark -> tm-word-1000.png (1000x1000)');

  /* 4. OG 分享卡 1200x630 */
  const ogHTML = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1200px;height:630px;font-family:${FONT_STACK};position:relative;overflow:hidden;
      background:radial-gradient(1200px 620px at 12% 18%,#12224a 0%,#070b1a 52%,#03050f 100%)}
    .glow{position:absolute;border-radius:50%;filter:blur(90px);opacity:.5}
    .g1{width:520px;height:520px;left:-90px;top:-140px;background:#38e1ff}
    .g2{width:460px;height:460px;left:520px;top:300px;background:#8b5cf6;opacity:.36}
    .inner{position:relative;width:100%;height:100%;display:flex;align-items:center;padding:0 88px;gap:56px}
    .mark{width:250px;height:250px;flex:0 0 auto}
    .mark svg{width:100%;height:100%;display:block}
    .t{display:flex;flex-direction:column}
    .brand{font-size:104px;font-weight:900;color:#F2F7FF;letter-spacing:.05em;line-height:1}
    .en{font-size:30px;font-weight:600;color:#38E1FF;letter-spacing:.3em;margin-top:20px}
    .bar{width:150px;height:6px;border-radius:3px;margin:34px 0 30px;
      background:linear-gradient(90deg,#38E1FF,#5B8CFF 48%,#8B5CF6)}
    .tag{font-size:38px;font-weight:500;color:#A9BCD8;line-height:1.5;letter-spacing:.02em}
    .foot{position:absolute;left:88px;bottom:56px;font-size:24px;color:#64748B;letter-spacing:.14em}
  </style></head><body>
    <div class="glow g1"></div><div class="glow g2"></div>
    <div class="inner">
      <span class="mark">${markColor}</span>
      <span class="t">
        <span class="brand">白驹</span>
        <span class="en">BAIJU · GLOBAL BRAIN</span>
        <span class="bar"></span>
        <span class="tag">把散落的 AI 工具<br>装进一个大脑</span>
      </span>
    </div>
    <div class="foot">AI 创作纪元 · 本地优先 · 数据不出本机</div>
  </body></html>`;
  await shot(ogHTML, 1200, 630, 'og-image.png');

  await browser.close();
  console.log('done.');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
