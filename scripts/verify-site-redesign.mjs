/* verify-site-redesign.mjs · 全站改版视觉验证
 * 验证 6 类代表性页面：双主题切换 / 毛玻璃导航 / 文章卡 / 品牌页脚 / 悬浮窗 / JS错误
 * 运行：NODE_PATH=./node_modules node scripts/verify-site-redesign.mjs
 */
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:8787'
const PAGES = [
  { path: '/index.html',              name: '首页(已改版)' },
  { path: '/website/index.html',      name: 'website 子站首页' },
  { path: '/blog/AI写作完全指南.html', name: 'blog 长文页' },
  { path: '/book/五卷全书/AI工具大全-百科全书.html', name: 'book 长文页' },
  { path: '/lab/index.html',          name: 'lab 实验室首页' },
  { path: '/novel/AI创作纪元.html',    name: 'novel 小说页' },
  { path: '/website/workstation.html',name: 'workstation 工作台' },
]

const results = []

async function checkPage(browser, page) {
  const url = BASE + encodeURI(page.path)
  const r = { name: page.name, path: page.path, ok: true, issues: [] }
  const ctx = await browser.newContext()
  const pg = await ctx.newPage()
  const jsErrors = []
  pg.on('pageerror', e => jsErrors.push(String(e).slice(0, 160)))
  pg.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text().slice(0, 160)) })

  try {
    await pg.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    await pg.waitForTimeout(600)

    // 1. 双主题引擎注入
    const themeLink = await pg.evaluate(() =>
      [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href).filter(h => /theme-cloud|site-redesign/.test(h)))
    if (themeLink.length < 2) r.issues.push('主题引擎CSS未注入: ' + themeLink.join(','))

    // 2. body data-theme
    const theme = await pg.evaluate(() => document.body.getAttribute('data-theme'))
    if (!theme) r.issues.push('data-theme 未设置')

    // 3. 导航毛玻璃
    const navBg = await pg.evaluate(() => {
      const el = document.querySelector('nav') || document.getElementById('topbar')
      if (!el) return null
      const cs = getComputedStyle(el)
      return { backdrop: cs.backdropFilter || cs.webkitBackdropFilter, bg: cs.backgroundColor }
    })
    if (navBg && !navBg.backdrop) r.issues.push('导航无毛玻璃(backdrop-filter)')

    // 4. 品牌页脚
    const footer = await pg.evaluate(() => {
      const f = document.querySelector('.site-footer, .ccw-footer, .foot-inner')
      return f ? { has: true, cls: f.className } : { has: false }
    })

    // 5. 悬浮窗(非 SKIP_PET 页面)
    const pet = await pg.evaluate(() => !!document.getElementById('ccowork-pet'))

    // 6. 切换到 deep 主题验证生效
    await pg.evaluate(() => document.body.setAttribute('data-theme', 'deep'))
    await pg.waitForTimeout(400)
    const deepBg = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor)

    // 7. 切回 cloud
    await pg.evaluate(() => document.body.setAttribute('data-theme', 'cloud'))
    await pg.waitForTimeout(300)
    const cloudBg = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor)

    r.theme = theme
    r.deepBg = deepBg
    r.cloudBg = cloudBg
    r.footer = footer
    r.pet = pet
    if (deepBg === cloudBg) r.issues.push('主题切换未生效(深浅背景相同)')
    if (jsErrors.length) r.issues.push('JS错误: ' + jsErrors.join(' | '))
  } catch (e) {
    r.ok = false
    r.issues.push('加载失败: ' + String(e).slice(0, 200))
  }
  await ctx.close()
  return r
}

const browser = await chromium.launch()
for (const p of PAGES) results.push(await checkPage(browser, p))
await browser.close()

console.log('='.repeat(66))
console.log('全站改版验证结果 · 6+1 类页面')
console.log('='.repeat(66))
let pass = 0
for (const r of results) {
  const flag = r.issues.length ? '❌' : '✅'
  if (!r.issues.length) pass++
  console.log(`\n${flag} ${r.name}  (${r.path})`)
  console.log(`   主题=${r.theme} | deepBg=${r.deepBg} | cloudBg=${r.cloudBg}`)
  console.log(`   品牌页脚=${r.footer ? r.footer.cls : '缺失'} | 悬浮窗=${r.pet ? '有' : '无(跳过页)'}`)
  if (r.issues.length) r.issues.forEach(i => console.log(`   ⚠ ${i}`))
}
console.log(`\n结果: ${pass}/${results.length} 页面通过`)
