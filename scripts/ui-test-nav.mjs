// ui-test-nav.mjs · A4 导航单一真源 · 真实浏览器 UI 验证（需 playwright-core + chromium）
// 运行：node scripts/ui-test-nav.mjs   （前提：本地 server.mjs 已启动在 8787）
// 覆盖：齿轮类名化 → 双主题 token → B1 主题桥接（悬浮窗↔index↔刷新保持）→ TOC z-index 9990
//      → 无障碍（role/aria/Esc/焦点）→ 移动端 TOC 不遮挡导航（A3 遗留根治验证）
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:8787'
let pass = 0, fail = 0
const ok = (c, n, e) => { c ? (pass++, console.log('✅ ' + n)) : (fail++, console.error('❌ ' + n + (e ? ' → ' + e : ''))) }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

// ---------- 1. index：齿轮类名化 + 无障碍 + 无 JS 错误 ----------
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForSelector('#modNavGear', { timeout: 8000 })
ok(true, 'index 导航注入 ⚙️ 齿轮（#modNavGear）')
const gearCls = await page.locator('#modNavGear').getAttribute('class')
ok(/nav-gear/.test(gearCls || ''), '齿轮类名化（.nav-gear，非内联样式）', gearCls)
const gearStyle = await page.locator('#modNavGear').getAttribute('style')
ok(!gearStyle || gearStyle.trim() === '', '齿轮无 style.cssText 内联残留（B4 根治）', gearStyle || '(空)')
const gearAria = await page.locator('#modNavGear').getAttribute('aria-label')
ok(gearAria === '外观设置', '齿轮带 aria-label', gearAria)

// 齿轮双主题 token 化（B3）：云顶浅底 / 深空深底
let gBg = await page.locator('#modNavGear').evaluate((el) => getComputedStyle(el).backgroundColor)
ok(gBg !== 'rgba(8, 12, 22, 0.9)', '云顶主题齿轮背景非深黑硬编码（B3 token 化）', gBg)
await page.evaluate(() => { document.body.setAttribute('data-theme', 'deep') })
await page.waitForTimeout(500)
gBg = await page.locator('#modNavGear').evaluate((el) => getComputedStyle(el).backgroundColor)
ok(gBg !== 'rgba(255, 255, 255, 0.85)', '深空主题齿轮背景适配（非浅色）', gBg)
await page.evaluate(() => { document.body.setAttribute('data-theme', 'cloud') })

// ---------- 2. 设置窗无障碍（B6）：role/aria/标题 ----------
await page.click('#modNavGear')
await page.waitForSelector('#modSettings.show', { timeout: 3000 })
const role = await page.locator('#modSettings').getAttribute('role')
const labelled = await page.locator('#modSettings').getAttribute('aria-labelledby')
ok(role === 'dialog', '设置窗 role="dialog"', role)
ok(labelled === 'modSettingsTitle', '设置窗 aria-labelledby', labelled)
const hasTitleId = await page.locator('#modSettingsTitle').count()
ok(hasTitleId === 1, '面板标题带 id=modSettingsTitle')

// Esc 关闭
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const escClosed = await page.locator('#modSettings.show').count()
ok(escClosed === 0, 'Esc 关闭设置窗（B6）')

// ---------- 3. 长文页 TOC：z-index 9990 + placeBar 定位（B8/B5） ----------
await page.goto(BASE + '/website/ai-academy.html', { waitUntil: 'networkidle' })
const hasToc = await page.locator('#modTocBar').count()
if (hasToc) {
  const z = await page.locator('#modTocBar').evaluate((el) => getComputedStyle(el).zIndex)
  ok(z === '9990', 'TOC 条 z-index=9990（B8 层级带根治）', z)
  const tocTop = await page.locator('#modTocBar').evaluate((el) => Math.round(el.getBoundingClientRect().top))
  const navBottom = await page.locator('nav').first().evaluate((el) => Math.round(el.getBoundingClientRect().bottom))
  ok(tocTop >= navBottom, 'TOC 条定位在导航正下方（placeBar 动态）', tocTop + ' ≥ ' + navBottom)
} else {
  ok(true, 'ai-academy 无 TOC（跳过）')
}

// ---------- 4. 移动端：TOC 不遮挡导航（A3 遗留根治验证） ----------
await page.setViewportSize({ width: 375, height: 700 })
await page.goto(BASE + '/website/faq.html', { waitUntil: 'networkidle' })
const tocM = await page.locator('#modTocBar').count()
if (tocM) {
  const tocRect = await page.locator('#modTocBar').evaluate((el) => {
    const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }
  })
  const navRect = await page.locator('nav').first().evaluate((el) => {
    const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }
  })
  ok(tocRect.top >= navRect.bottom - 2, '移动端 TOC 在导航下方（不重叠）', JSON.stringify({ toc: tocRect, nav: navRect }))
} else {
  ok(true, 'faq 移动端无 TOC（跳过）')
}

// ---------- 5. B1 主题桥接（核心）：悬浮窗切深色 → 双键同步 → 刷新保持 ----------
await page.setViewportSize({ width: 1280, height: 800 })
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
// 播种旧键（模拟老用户已有 baiju-config-v2 配置）+ 清场切 cloud
await page.evaluate(() => {
  localStorage.setItem('ccowork.theme', 'cloud')
  localStorage.setItem('baiju-config-v2', JSON.stringify({ mode: 'ark', key: 'sk-test', voice: false, mm: false, deep: false, wall: '' }))
})
await page.click('#modNavGear')
await page.waitForSelector('#modSettings.show')
await page.click('#modSettings [data-theme-set="deep"]')
await page.waitForTimeout(400)
const lsTheme = await page.evaluate(() => localStorage.getItem('ccowork.theme'))
ok(lsTheme === 'deep', '悬浮窗切深色 → ccowork.theme=deep（真源）', lsTheme)
const lsConf = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('baiju-config-v2') || 'null') } catch (e) { return null } })
ok(lsConf && lsConf.deep === true, '悬浮窗切深色 → 旧键 baiju-config-v2.deep 同步（B1 桥接）', JSON.stringify(lsConf && lsConf.deep))
await page.keyboard.press('Escape')

// 刷新 → 深色保持（此前 index 会读 baiju-config 覆盖，BUG 复现路径）
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const themeAfterReload = await page.evaluate(() => document.body.getAttribute('data-theme'))
ok(themeAfterReload === 'deep', '刷新后深色保持（双真源 BUG 已修复）', themeAfterReload)

// themeBtn 切回浅色 → ccowork.theme 同步
await page.click('#themeBtn')
await page.waitForTimeout(400)
const lsTheme2 = await page.evaluate(() => localStorage.getItem('ccowork.theme'))
ok(lsTheme2 === 'cloud', '导航 themeBtn 切回 → ccowork.theme=cloud 同步', lsTheme2)
const lsConf2 = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('baiju-config-v2') || 'null') } catch (e) { return null } })
ok(lsConf2 && lsConf2.deep === false, 'themeBtn 切回 → 旧键 deep 同步 false', JSON.stringify(lsConf2 && lsConf2.deep))
// 清场：恢复 cloud
await page.evaluate(() => { localStorage.setItem('ccowork.theme', 'cloud') })

// ---------- 6. 全局无 JS 错误 ----------
ok(errors.length === 0, '无页面 JS 错误', errors.join(' | '))
await browser.close()
console.log('\n' + (fail ? '❌ A4 UI 测试失败 ' + fail + ' 项' : '🎉 A4 UI 测试全部通过 ' + pass + ' 项'))
process.exit(fail ? 1 : 0)
