// 正文配图：长文页第2个 H2 后插入智谱免费生成的宽幅主题图
// 用法: node scripts/gen-body-images.mjs [并发数默认2]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CONC = parseInt(process.argv[2] || '2', 10);
const ZHIPU = (() => {
  const env = fs.readFileSync('.env', 'utf8');
  const m = env.match(/ZHIPU_API_KEY\s*=\s*([^\r\n]+)/);
  return m ? m[1].trim() : '';
})();
if (!ZHIPU) { console.error('无 ZHIPU_API_KEY'); process.exit(1); }

// 优先级扫描目录
const DIRS = ['blog', 'website/ai-academy', 'lab', 'website/book', 'website', 'website/ai-academy/projects'];
const seen = new Set();
const pages = [];
function scan(d) {
  if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f).replace(/\\/g, '/');
    if (seen.has(p)) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) { scan(p); continue; }
    if (!f.endsWith('.html')) continue;
    seen.add(p);
    const h = fs.readFileSync(p, 'utf8');
    if ((h.match(/<h2[ >]/g) || []).length >= 3 && !/cc-body-img/.test(h) && !/<title>.*404/i.test(h)) pages.push(p);
  }
}
DIRS.forEach(scan);
console.log('待配图页面:', pages.length);

const FAILS = [];
let done = 0;

function relAssets(p) {
  const depth = p.split('/').length - 1;
  return '../'.repeat(depth) + 'assets/body/';
}

function slugFor(p) {
  return 'bb-' + path.basename(p, '.html').replace(/[^\w\u4e00-\u9fa5-]+/g, '').slice(-60);
}

async function genImage(prompt, dest) {
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + ZHIPU, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'cogview-3-flash', prompt, size: '1344x768' }),
        signal: AbortSignal.timeout(120000)
      });
      const j = await res.json();
      const url = j.data && j.data[0] && j.data[0].url;
      if (!url) throw new Error('无url: ' + JSON.stringify(j).slice(0, 120));
      const img = await fetch(url, { signal: AbortSignal.timeout(120000) });
      fs.writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
      if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) return true;
      throw new Error('图片过小');
    } catch (e) {
      const msg = String(e.message || e);
      if (/1302|limit|频率/i.test(msg)) {
        const wait = [30, 60, 120, 240, 480, 600][i] || 600;
        console.log('  限速退避', wait + 's');
        await new Promise(r => setTimeout(r, wait * 1000));
      } else {
        console.log('  出错重试:', msg.slice(0, 80));
        await new Promise(r => setTimeout(r, 8 * 1000));
      }
    }
  }
  return false;
}

function plan(p) {
  const h = fs.readFileSync(p, 'utf8');
  if (/cc-body-img/.test(h)) return null;
  const h2s = [...h.matchAll(/<\/h2>/g)];
  if (h2s.length < 2) return null;
  const title = (h.match(/<title>([^<]*)<\/title>/) || [, ''])[1].replace(/\s*\|\s*.*$/, '').trim().slice(0, 40);
  const h2txt = (h.slice(h2s[1].index - 400, h2s[1].index).match(/<h2[^>]*>([^<]*)$/) || [, ''])[1].replace(/<[^>]+>/g, '').trim().slice(0, 30);
  const name = slugFor(p);
  return { name, title: title + ' · ' + h2txt, prompt: '信息图风格宽幅插画：' + title + '，主题"' + h2txt + '"，蓝紫科技渐变配色，扁平现代信息图，细节丰富，无文字' };
}

function inject(p, meta) {
  let h = fs.readFileSync(p, 'utf8');
  if (/cc-body-img/.test(h)) return;
  const h2s = [...h.matchAll(/<\/h2>/g)];
  if (h2s.length < 2) return;
  const at = h2s[1].index + '</h2>'.length;
  const src = relAssets(p) + meta.name + '.png';
  const fig = '\n<figure class="cc-body-img"><img src="' + src + '" alt="' + meta.title + '" loading="lazy"></figure>\n';
  h = h.slice(0, at) + fig + h.slice(at);
  fs.writeFileSync(p, h);
}

async function worker() {
  while (pages.length) {
    const p = pages.shift();
    const meta = plan(p);
    if (!meta) { continue; }
    const dest = 'assets/body/' + meta.name + '.png';
    if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) { inject(p, meta); done++; continue; }
    fs.mkdirSync('assets/body', { recursive: true });
    const ok = await genImage(meta.prompt, dest);
    if (ok) { inject(p, meta); done++; console.log('✅ [' + done + '/' + (done + pages.length) + ']', p); }
    else { FAILS.push(p); console.log('❌', p); }
  }
}

fs.mkdirSync('assets/body', { recursive: true });
await Promise.all(Array.from({ length: CONC }, () => worker()));
console.log('完成:', done, ' 失败:', FAILS.length);
if (FAILS.length) fs.writeFileSync('scripts/_body-fails.json', JSON.stringify(FAILS, null, 2));
