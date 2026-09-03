import fs from 'fs'
import path from 'path'
import vm from 'node:vm'

const ROOT = process.cwd()
const allHtml = []
;(function walk(d){
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    // 只审计源码真源：跳过生成物/内部目录（deploy 为 prepare-deploy 副本，_internal 内部报告，templates 模板，均非用户可访问页）
    if(e.name==='node_modules'||e.name==='.git'||e.name==='_archive'||e.name==='deploy'||e.name==='_internal'||e.name==='templates') continue
    const p=path.join(d,e.name)
    if(e.isDirectory()) walk(p)
    else if(e.name.endsWith('.html')) allHtml.push(p)
  }
})(ROOT)

// 分类：站点页 vs 内容库（用全路径比较，避免 rel/full 混用）
const relOf = p=>p.replace(ROOT,'').replace(/\\/g,'/').replace(/^\//,'')
const isSite = p=>{const r=relOf(p); return /^(website\/|index\.html$)/.test(r)}
const sitePages = allHtml.filter(isSite)
const contentPages = allHtml.filter(p=>!isSite(p))

function rel(p){return relOf(p)}

function checkJS(html){
  // 只检查可执行 JS 块：跳过外链(src=) 与数据块(type=application/ld+json|json 等，B1 SEO v2 注入后全站大量 JSON-LD)
  // 性能：vm.Script 内存内编译（等价 node --check，避免每块 spawn 子进程——278 页×数十块可差百倍耗时）
  const blocks = [] // { code, isModule }
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) {
    const attrs = m[1] || ''
    const code = m[2] || ''
    if (/\bsrc\s*=/.test(attrs)) continue // 外链脚本
    const tm = /type\s*=\s*["']([^"']+)["']/i.exec(attrs)
    if (tm && !/javascript|module/i.test(tm[1])) continue // ld+json / json 数据块非 JS
    if (code.trim()) blocks.push({ code, isModule: !!(tm && /module/i.test(tm[1])) })
  }
  let err = 0
  let modules = 0
  for (const { code, isModule } of blocks) {
    if (isModule) { modules++; continue } // type=module 语法由浏览器校验，vm 非 module 模式会误报 import
    try { new vm.Script(code) } catch (e) { err++ }
  }
  return { blocks: blocks.length, modules, err }
}

const report=[]
for(const p of allHtml){
  const h=fs.readFileSync(p,'utf8')
  const title=(h.match(/<title>([^<]*)<\/title>/)||[])[1]||''
  const bodyTxt=(h.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())
  const imgs=[...h.matchAll(/<img[^>]*src=["']([^"']+)["']/g)].map(m=>m[1])
  const links=[...h.matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1])
  const iframes=[...h.matchAll(/<iframe[^>]*src=["']([^"']+)["']/g)].map(m=>m[1])
  const js=checkJS(h)
  // 宣称数量
  const claims=[...h.matchAll(/(?:(\d+)\s*(?:个|条|篇|章|大|项|问|张|种))/g)].map(m=>+m[1])
  const maxClaim=claims.length?Math.max(...claims):0
  // 死链（href 可能 URL 编码中文文件名：decode 后再判；剥离 #锚点 与 ?query；孤立 % 容错）
  const toPath = (u) => {
    let clean
    try { clean = decodeURIComponent(u.split('#')[0].split('?')[0]) } catch (e) { clean = u.split('#')[0].split('?')[0] }
    if (clean.startsWith('/')) return path.join(ROOT, clean)
    return path.resolve(path.dirname(p), clean)
  }
  let dead=0
  for(const l of links){
    if(/^(https?:|#|mailto:|javascript:|tel:)/.test(l)) continue
    if(!l.endsWith('.html')&&!l.endsWith('.css')&&!l.endsWith('.js')) continue
    if(!fs.existsSync(toPath(l))) dead++
  }
  // 坏图
  let badImg=0
  for(const i of imgs){
    if(/^https?:/.test(i)) continue
    if(!fs.existsSync(toPath(i))) badImg++
  }
  report.push({p:rel(p),cat:sitePages.includes(p)?'SITE':'CONTENT',title:title.slice(0,40),bytes:h.length,
    txtLen:bodyTxt.length,imgs:imgs.length,badImg,links:links.length,dead,iframes:iframes.length,
    jsBlk:js.blocks,jsErr:js.err,maxClaim})
}

// 身份撞车
const IDENT=/总站|门户|枢纽|全栈指南|全能工作台|全域|全方向|中心站|终极指南|一体化平台/
console.log('\n===== 一、身份撞车（抢入口的页）=====')
report.filter(r=>IDENT.test(r.title)).forEach(r=>console.log(`  ⚠ ${r.p}  →  "${r.title}"`))

console.log('\n===== 二、站点页体检（website/ + 根index）=====')
console.log('  页 | 字节 | 正文长 | 图(坏) | 链(死) | iframe | JS(错) | 宣称最大数')
report.filter(r=>r.cat==='SITE').sort((a,b)=>a.p.localeCompare(b.p)).forEach(r=>{
  console.log(`  ${r.p.padEnd(34)} | ${String(r.bytes).padStart(6)} | ${String(r.txtLen).padStart(5)} | ${r.imgs}(${r.badImg}) | ${r.links}(${r.dead}) | ${r.iframes} | ${r.jsBlk}(${r.jsErr}) | ${r.maxClaim}`)
})

console.log('\n===== 三、可疑空壳/薄页（正文<400字 且 非内容库）=====')
report.filter(r=>r.cat==='SITE'&&r.txtLen<400).forEach(r=>console.log(`  ${r.p} | 正文${r.txtLen}字 | "${r.title}"`))

console.log('\n===== 四、JS语法错误页 ====')
report.filter(r=>r.jsErr>0).forEach(r=>console.log(`  ${r.p} | ${r.jsErr}个错误块`))

console.log('\n===== 五、死链汇总（按页）=====')
report.filter(r=>r.dead>0).sort((a,b)=>b.dead-a.dead).slice(0,30).forEach(r=>console.log(`  ${r.p} | 死链${r.dead} | 总链${r.links}`))

console.log('\n===== 六、坏图汇总（按页）=====')
report.filter(r=>r.badImg>0).sort((a,b)=>b.badImg-a.badImg).slice(0,30).forEach(r=>console.log(`  ${r.p} | 坏图${r.badImg} | 总图${r.imgs}`))

// 可达性 BFS from index.html
function reachable(seed){
  const seen=new Set(); const q=[seed]; const dep={}
  while(q.length){
    const cur=q.shift(); if(seen.has(cur))continue; seen.add(cur)
    const h=fs.readFileSync(cur,'utf8')
    const ls=[...h.matchAll(/href=["']([^"']+\.html)["']/g)].map(m=>m[1])
    for(const l of ls){
      let clean
      try { clean = decodeURIComponent(l.split('#')[0]) } catch (e) { clean = l.split('#')[0] } // 编码中文文件名需解码才能命中磁盘文件；孤立 % 容错
      let t
      if(clean.startsWith('/')) t=path.join(ROOT,clean)
      else t=path.resolve(path.dirname(cur),clean)
      if(fs.existsSync(t)&&!seen.has(t)) { q.push(t); dep[rel(t)]=(dep[rel(cur)]||0)+1 }
    }
  }
  return {seen,dep}
}
const r1=reachable(path.join(ROOT,'index.html'))
const allSite=report.filter(r=>r.cat==='SITE').map(r=>r.p)
const orphan=allSite.filter(p=>!r1.seen.has(path.join(ROOT,p)))
console.log('\n===== 七、可达性（从根index BFS）=====')
console.log('  从index可达站点页数:', allSite.filter(p=>r1.seen.has(path.join(ROOT,p))).length, '/', allSite.length)
console.log('  孤儿站点页(从index点不到):', orphan.length?orphan.join(', '):'无')

console.log('\n===== 八、内容库规模 =====')
const byDir={}
contentPages.forEach(p=>{const d=path.dirname(rel(p));byDir[d]=(byDir[d]||0)+1})
Object.entries(byDir).sort((a,b)=>b[1]-a[1]).forEach(([d,n])=>console.log(`  ${d} : ${n}页`))
console.log('  内容库总页数:',contentPages.length)
