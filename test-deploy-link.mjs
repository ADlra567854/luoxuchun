// 云端部署 E2E 验证：白驹直连 / 生图直连 / 双主题引擎 / 悬浮组件
import { chromium } from 'playwright'

const BASE = 'https://d30b834e175c42e885f476edbf873aa4.app.workbuddy.link'
const nc = () => '?nc=' + Date.now()
const browser = await chromium.launch()
const out = {}

// ---------- 1) 主站：白驹对话 + 主题引擎 ----------
{
  const p = await browser.newPage()
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 160)))
  await p.goto(BASE + '/' + nc(), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(4000)

  out.home = await p.evaluate(() => ({
    title: document.title,
    hasAI: typeof window.AI !== 'undefined',
    hasKey: !!(window.CC && window.CC.get && window.CC.get('deepseek')),
    theme: document.body.getAttribute('data-theme'),
    themeCssLoaded: [...document.styleSheets].some(s => (s.href || '').includes('theme-cloud')),
    mode: (document.getElementById('mode') || {}).value
  }))

  // 后端探测结果（云端应为 false → 走直连）
  out.home.hasBackend = await p.evaluate(async () => {
    try { const r = await fetch('/api/health', { cache: 'no-store' }); const t = await r.text(); return /"status"\s*:\s*"ok"/.test(t) } catch (e) { return false }
  })

  // 真发一条白驹消息
  await p.fill('#q', '一句话说明白驹是什么').catch(() => {})
  await p.click('#send').catch(() => {})
  await p.waitForTimeout(22000)
  out.home.reply = await p.evaluate(() => {
    const n = document.querySelectorAll('#msgs .msg, #msgs > div')
    return n.length ? (n[n.length - 1].innerText || '').slice(0, 180) : '(无输出)'
  })

  // 主题切换（另一 agent 新功能）
  out.home.themeSwitch = await p.evaluate(() => {
    const before = document.body.getAttribute('data-theme')
    document.body.setAttribute('data-theme', before === 'cloud' ? 'deep' : 'cloud')
    const after = document.body.getAttribute('data-theme')
    const bg = getComputedStyle(document.body).backgroundColor
    return { before, after, bgAfter: bg }
  })
  out.home.errors = errs.slice(0, 6)
  await p.close()
}

// ---------- 2) 画廊：生图直连 ----------
{
  const p = await browser.newPage()
  const errs = []
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 140)))
  await p.goto(BASE + '/website/gallery.html' + nc(), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(3500)
  out.gallery = await p.evaluate(async () => {
    const r = { hasMedia: typeof window.MG !== 'undefined' || typeof window.MediaGen !== 'undefined', arkKey: false }
    try { r.arkKey = !!(window.CC && window.CC.get && window.CC.get('ark')) } catch (e) {}
    const api = window.MG || window.MediaGen
    if (!api || !api.genImage) { r.img = '(无 genImage API)'; return r }
    try {
      // 正确签名：genImage(prompt, opts)
      const u = await api.genImage('一只在云端奔跑的白色骏马，国风水墨', { size: '2k' })
      r.img = typeof u === 'string' ? u.slice(0, 110) : JSON.stringify(u).slice(0, 160)
    } catch (e) { r.img = 'ERR: ' + (e.message || e).slice(0, 140) }
    return r
  })
  out.gallery.errors = errs.slice(0, 4)
  await p.close()
}

// ---------- 3) 子页悬浮白驹 ----------
{
  const p = await browser.newPage()
  await p.goto(BASE + '/website/ai-money.html' + nc(), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(3000)
  out.subpage = await p.evaluate(async () => {
    const r = {
      fabBaiju: !!document.getElementById('bj-fab'),        // 悬浮问白驹
      ccowork: !!document.querySelector('[id^=ccowork]'),   // 悬浮工作台
      theme: document.body.getAttribute('data-theme'),      // 主题引擎生效
      themeCss: [...document.styleSheets].some(s => (s.href || '').includes('theme-cloud'))
    }
    // 真点开悬浮白驹发一条
    try {
      document.getElementById('bj-fab').click()
      const inp = document.getElementById('bj-in'); inp.value = '用一句话说说AI变现'
      document.getElementById('bj-send').click()
      await new Promise(s => setTimeout(s, 20000))
      const ms = document.querySelectorAll('#bj-msgs > div')
      r.reply = ms.length ? (ms[ms.length - 1].innerText || '').slice(0, 130) : '(无输出)'
    } catch (e) { r.reply = 'ERR: ' + (e.message || e).slice(0, 100) }
    return r
  })
  await p.close()
}

console.log(JSON.stringify(out, null, 2))
await browser.close()
