/* C1 端到端验证：测验 → 答题 → 判分 → 证书发放 → 证书页展示 → 打印弹层 */
import { chromium } from 'playwright'
const BASE = 'http://127.0.0.1:8787'
const results = []
const ok = (name, pass, extra='') => { results.push({name, pass, extra}); console.log((pass?'✓':'✗')+' '+name+(extra?' — '+extra:'')) }

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('console', m => { if(m.type()==='error') errors.push(m.text()) })
page.on('pageerror', e => errors.push(String(e)))

/* 1. 测验页加载 + 10 域卡片渲染（5 可用 + 5 扩充中） */
await page.goto(BASE + '/website/ai-academy-quiz.html', { waitUntil: 'networkidle' })
await page.waitForSelector('#domainGrid .card', { timeout: 8000 })
const domainCards = await page.locator('#domainGrid .card').count()
const activeCards = await page.locator('#domainGrid .card button[data-start]').count()
const pendingCards = await page.locator('#domainGrid .card button:disabled').count()
ok('测验页 10 个知识域卡片渲染', domainCards === 10, 'cards=' + domainCards)
ok('5 个可用域 + 5 个扩充中', activeCards === 5 && pendingCards === 5, 'active=' + activeCards + ' pending=' + pendingCards)

/* 2. 练习模式：basic 域答题 10 题全对 */
await page.locator('#domainGrid .card').first().locator('[data-start]').click()
let qIdx = 0
for(;;){
  const qText = (await page.locator('.quiz-box h3').innerText()).trim()
  const q = await page.evaluate((qt) => {
    return (window.AI_QUIZ.questions || []).find(x => x.q === qt) || null
  }, qText)
  if(!q){ ok('找到当前题目数据', false, qText.slice(0,40)); break }
  if(q.type === 'multi'){
    for(const a of q.answer) await page.locator(`.opt[data-v="${a}"]`).click()
  } else if(q.type === 'judge'){
    await page.locator(`.opt[data-v="${q.answer === '正确' ? 'T' : 'F'}"]`).click()
  } else {
    await page.locator(`.opt[data-v="${q.answer}"]`).click()
  }
  const next = page.locator('#nextBtn')
  const submit = page.locator('#submitBtn')
  if(await submit.isVisible().catch(()=>false)){ qIdx++; break }
  await next.click()
  qIdx++
}
ok('练习模式完成 10 题作答', qIdx === 10, 'answered=' + qIdx)
await page.locator('#submitBtn').click().catch(()=>{})
await page.waitForSelector('.result .rnum', { timeout: 4000 })
const pct = await page.locator('.result .rnum').innerText()
ok('练习判分结果显示 100%', pct.includes('100'), 'pct=' + pct)

/* 3. 认证考试 cert02：全对 → 发证 */
await page.goto(BASE + '/website/ai-academy-quiz.html?cert=cert02', { waitUntil: 'networkidle' })
await page.waitForSelector('#examBox .q-meta', { timeout: 8000 })
let examAnswered = 0
for(;;){
  const qText = (await page.locator('#examBox h3').innerText()).trim()
  const q = await page.evaluate((qt) => (window.AI_QUIZ.questions || []).find(x => x.q === qt) || null, qText)
  if(!q){ ok('考试找到当前题目数据', false, qText.slice(0,40)); break }
  if(q.type === 'multi'){ for(const a of q.answer) await page.locator(`#examBox .opt[data-v="${a}"]`).click() }
  else if(q.type === 'judge'){ await page.locator(`#examBox .opt[data-v="${q.answer === '正确' ? 'T' : 'F'}"]`).click() }
  else { await page.locator(`#examBox .opt[data-v="${q.answer}"]`).click() }
  const submit = page.locator('#submitBtn')
  if(await submit.isVisible().catch(()=>false)){ examAnswered++; break }
  await page.locator('#nextBtn').click()
  examAnswered++
}
ok('认证考试完成 10 题作答', examAnswered === 10, 'answered=' + examAnswered)
await page.locator('#submitBtn').click()
await page.waitForSelector('.result .rpass', { timeout: 4000 })
const certState = await page.evaluate(() => JSON.parse(localStorage.getItem('ccowork.certs') || '{}'))
ok('考试通过 → 证书写入 localStorage', !!certState.cert02, 'cert02=' + JSON.stringify(certState.cert02))
const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('ccowork.quiz.history') || '[]'))
ok('测验历史记录写入', hist.length >= 2, 'history=' + hist.length)

/* 4. 证书页：我的认证渲染 + 打印弹层 */
await page.goto(BASE + '/website/ai-academy-cert.html', { waitUntil: 'networkidle' })
await page.waitForSelector('#mineGrid .mine', { timeout: 6000 })
const mineCount = await page.locator('#mineGrid .mine').count()
const gotText = await page.locator('#mineGrid').innerText()
ok('证书页「我的认证」4 张卡渲染', mineCount === 4, 'cards=' + mineCount)
ok('已获证状态展示（cert02）', gotText.includes('智能体工程师认证') && gotText.includes('已获证') && gotText.includes('认证有效'))
await page.locator('[data-print="cert02"]').click()
await page.waitForSelector('#certModal.open', { timeout: 4000 })
await page.fill('#cpName', '老罗测试')
const cpCert = await page.locator('#cpCert').innerText()
ok('打印弹层打开 + 证书名称正确', cpCert.includes('智能体工程师'), 'cert=' + cpCert)
const cpNo = await page.locator('#cpNo').innerText()
ok('证书编号生成', /CCOWORK-CERT02-\d{8}/.test(cpNo), 'no=' + cpNo)
const nameShow = await page.locator('#cpNameShow').innerText()
ok('持证人姓名回显', nameShow.includes('老罗测试'), 'show=' + nameShow)

/* 5. 未获证证书显示待考取 + 考试入口链接 */
await page.evaluate(() => localStorage.removeItem('ccowork.certs'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('#mineGrid .mine', { timeout: 6000 })
const waitText = await page.locator('#mineGrid').innerText()
ok('未获证状态展示（待考取 + 考试入口）', waitText.includes('待考取') && waitText.includes('参加考试'))

/* 6. 学院首页入口 */
await page.goto(BASE + '/website/ai-academy.html', { waitUntil: 'networkidle' })
const chip = page.locator('a.chip[href="./ai-academy-quiz.html"]')
ok('学院首页「章节测验」入口存在', await chip.count() > 0)
const certCta = page.locator('a.chip[href*="ai-academy-quiz.html?cert=cert02"]')
ok('认证区块「考取智能体工程师」CTA 存在', await certCta.count() > 0)

ok('页面零 JS 错误', errors.length === 0, errors.slice(0,3).join(' | '))
await browser.close()
const failed = results.filter(r => !r.pass)
console.log('\n=== C1 验证汇总: ' + (results.length - failed.length) + '/' + results.length + ' 通过 ===')
process.exit(failed.length ? 1 : 0)
