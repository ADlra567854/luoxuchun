// ui-test-search.mjs · A3 全站搜索 · 真实浏览器 UI 验证（需 playwright-core + chromium）
// 运行：node scripts/ui-test-search.mjs   （前提：本地 server.mjs 已启动在 8787）
// 覆盖：搜索按钮注入 → 打开面板 → 中文/英文检索 → 高亮 → 键盘导航 → 深色主题 → 移动端
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:8787'
let pass = 0, fail = 0
const ok = (c, n, e) => { c ? (pass++, console.log('✅ ' + n)) : (fail++, console.error('❌ ' + n + (e ? ' → ' + e : ''))) }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

// 1. index.html：搜索按钮注入导航
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForSelector('#ccowSearchBtn', { timeout: 8000 })
ok(true, 'index.html 导航注入搜索按钮')

// 2. 打开面板 → 输入中文查询 → 结果+高亮
await page.click('#ccowSearchBtn')
await page.waitForSelector('#ccowSearchBackdrop.show', { timeout: 3000 })
await page.fill('#ccowSearchInput', '提示词工程')
await page.waitForSelector('.ccowSearchItem', { timeout: 8000 })
const n1 = await page.locator('.ccowSearchItem').count()
ok(n1 > 0, '中文查询「提示词工程」有结果', n1 + ' 条')
const hasMark = await page.locator('.ccowSearchItem mark').count()
ok(hasMark > 0, '命中词高亮 <mark>', hasMark + ' 处')

// 3. 键盘导航：↓ + Enter 跳转
await page.keyboard.press('ArrowDown')
const curCls = await page.locator('.ccowSearchItem.cur').count()
ok(curCls === 1, '↓ 选中第一项')
const href0 = await page.locator('.ccowSearchItem').first().getAttribute('href')
await page.keyboard.press('Enter')
await page.waitForTimeout(900)
ok(page.url() !== BASE + '/', 'Enter 跳转到结果页', page.url())

// 4. 英文查询（书页有直接注入的 search.js）
await page.goto(BASE + '/website/book/pages/01-DeepSeek-V4-Pro-小白入门.html', { waitUntil: 'networkidle' })
await page.waitForSelector('#ccowSearchBtn', { timeout: 8000 })
ok(true, '无 module.js 的书页注入搜索按钮')
await page.click('#ccowSearchBtn')
await page.fill('#ccowSearchInput', 'DeepSeek 入门')
await page.waitForSelector('.ccowSearchItem', { timeout: 8000 })
const firstT = await page.locator('.ccowSearchItem .t').first().textContent()
ok(/DeepSeek/i.test(firstT), '「DeepSeek 入门」首条含 DeepSeek', firstT)
await page.keyboard.press('Escape')
const closed = await page.locator('#ccowSearchBackdrop.show').count()
ok(closed === 0, 'ESC 关闭面板')

// 5. 深色主题适配（theme-cloud.css 对 body * 有 0.35s 背景过渡，等过渡完成再读）
await page.evaluate(() => { document.body.setAttribute('data-theme', 'deep') })
await page.waitForTimeout(500)
await page.click('#ccowSearchBtn')
await page.fill('#ccowSearchInput', 'AI 安全')
await page.waitForSelector('.ccowSearchItem', { timeout: 8000 })
const panelBg = await page.locator('#ccowSearchPanel').evaluate((el) => getComputedStyle(el).backgroundColor)
ok(panelBg !== 'rgba(255, 255, 255, 0.98)', '深色主题面板背景适配', panelBg)

// 6. 快捷键 Ctrl+K / 关闭重开
await page.keyboard.press('Escape')
await page.keyboard.press('Control+k')
const reopened = await page.locator('#ccowSearchBackdrop.show').count()
ok(reopened === 1, 'Ctrl+K 唤起搜索')
await page.keyboard.press('Escape')

// 7. 移动端：按钮存在（导航内或悬浮回退均可用）
await page.setViewportSize({ width: 375, height: 700 })
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' })
await page.waitForSelector('#ccowSearchBtn', { timeout: 8000 })
const navBtn = await page.locator('#ccowSearchBtn').count()
ok(navBtn === 1, '移动端 index 搜索按钮存在（导航或悬浮）')
await page.goto(BASE + '/website/faq.html', { waitUntil: 'networkidle' })
await page.waitForSelector('#ccowSearchBtn', { timeout: 8000 })
await page.click('#ccowSearchBtn')
await page.fill('#ccowSearchInput', 'FAQ')
await page.waitForSelector('.ccowSearchItem', { timeout: 8000 })
ok((await page.locator('.ccowSearchItem').count()) > 0, 'faq 页检索可用')

ok(errors.length === 0, '无页面 JS 错误', errors.join(' | '))
await browser.close()
console.log('\n' + (fail ? '❌ UI 测试失败 ' + fail + ' 项' : '🎉 UI 测试全部通过 ' + pass + ' 项'))
process.exit(fail ? 1 : 0)
