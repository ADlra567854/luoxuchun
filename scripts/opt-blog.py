#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""opt-blog.py — 博文全站补全：
1) 生成 blog/index.html 目录页（双主题，收录全部博文）
2) 每篇博文注入：暗金紫封面 SVG + 上一篇/下一篇 + 返回目录 + 出处声明
"""
import os, re, glob, html as H

ROOT = os.path.dirname(os.path.abspath(__file__)) + '/..'
BLOG = os.path.join(ROOT, 'blog')

def title_of(p):
    t = open(p, encoding='utf-8', errors='ignore').read()
    m = re.search(r'<title>([^<]*)</title>', t)
    return m.group(1).split('·')[0].strip() if m else os.path.basename(p)

def cover_emoji(title):
    for k, v in [('创业','💼'),('办公','💻'),('工具','🧰'),('学习','🎓'),('视频','🎬'),
                 ('绘画','🎨'),('编程','👨\u200d💻'),('医疗','🏥'),('教育','🏫'),('制造','🏭'),
                 ('公务员','🏛'),('提示词','🧭'),('Transformer','🧠'),('大模型','🧠'),
                 ('开源','🔓'),('AI','🤖'),('未来','🔮'),('智能体','🐎'),('变现','💰')]:
        if k in title: return v
    return '📘'

def dark_cover(title, subtitle=''):
    em = cover_emoji(title)
    esc = H.escape(title)
    sub = H.escape(subtitle) if subtitle else '白驹全局大脑 · 深度长文 · 每日更新'
    return f'''<svg viewBox="0 0 1200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{esc}" style="width:100%;height:auto;border-radius:16px;margin:0 0 24px;box-shadow:0 10px 28px rgba(0,0,0,.35)">
  <defs>
    <linearGradient id="bgrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f5c26b"/><stop offset=".5" stop-color="#ff8c5a"/><stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="240" rx="18" fill="url(#bgrad)"/>
  <circle cx="1120" cy="30" r="180" fill="rgba(255,255,255,.12)"/>
  <circle cx="90" cy="240" r="150" fill="rgba(255,255,255,.08)"/>
  <circle cx="600" cy="-70" r="210" fill="rgba(255,255,255,.07)"/>
  <text x="56" y="78" font-size="20" font-weight="700" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">白驹全局大脑 · 深度长文</text>
  <text x="56" y="142" font-size="42" font-weight="900" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, sans-serif">{esc[:22]}</text>
  <text x="56" y="184" font-size="18" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">{sub[:46]}</text>
  <text x="1120" y="205" font-size="96" text-anchor="middle" fill="rgba(255,255,255,.92)">{em}</text>
</svg>'''

def inject_post(fp, prev, nextp):
    html = open(fp, encoding='utf-8', errors='ignore').read()
    if 'blog-prevnext' in html:  # 已处理（opt-blog 独有标记；不再要求 bgrad，避免 gen-viral 新头图页面被重复注入）
        return 'skip'
    title = title_of(fp)
    cover = dark_cover(title)
    # 封面插到 <article> 之后；仅当 article 块内【任意位置】尚无 1200x240 封面 SVG 时注入
    # （修复 2026-09-03 复发：gen-viral 模板是 <h1> 在前、封面在后，旧守卫只查 article 后紧跟 svg
    #   永远匹配不上 → 每次新「爆款生产线」文章都被重复注入旧「深度长文」头图成双头图）
    if '<article>' in html and not re.search(r'<article[^>]*>[\s\S]*?<svg viewBox="0 0 1200 240"', html):
        html = html.replace('<article>', '<article>\n' + cover, 1)
    # 上一篇/下一篇 + 返回目录 + 出处
    def link(p):
        if not p: return None
        return f'<a href="{os.path.basename(p)}" style="color:var(--gold);font-weight:700;text-decoration:none">{title_of(p)[:18]}</a>'
    pv, nx = link(prev), link(nextp)
    pv_html = pv or '<span style="color:var(--muted)">已是第一篇</span>'
    nx_html = nx or '<span style="color:var(--muted)">已是最新一篇</span>'
    nav = f'''
<div class="blog-prevnext" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:40px 0 10px;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:var(--card)">
  <span style="font-size:13px">{pv_html}</span>
  <a href="index.html" style="color:var(--cyan);font-weight:700;text-decoration:none;font-size:13px">📚 博客目录</a>
  <span style="font-size:13px">{nx_html}</span>
</div>
<hr>
<p style="color:var(--muted);font-size:12.5px;line-height:1.8">📌 出处声明：本页内容为白驹全局大脑原创，或已标注引用来源；改编内容遵循原始项目许可证（如 MIT / CC），不侵犯原作者权益。若引用内容涉及版权问题，请联系我们更正。</p>
</article>'''
    if '</article>' in html:
        html = html.replace('</article>', nav, 1)
    open(fp, 'w', encoding='utf-8').write(html)
    return 'ok'

def gen_index(posts):
    cards = []
    for p, title in posts:
        fn = os.path.basename(p)
        em = cover_emoji(title)
        cards.append(f'''<a class="pcard" href="{H.escape(fn)}"><span class="pico">{em}</span><h4>{H.escape(title[:30])}</h4><p>深度长文 · 真实可核验 · 白驹全局大脑</p><span class="go">阅读文章 →</span></a>''')
    grid = '\n    '.join(cards)
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta property="og:title" content="博客目录 · 白驹全局大脑 · 深度长文">
<meta name="description" content="白驹全局大脑博客目录：AI 创业、工具实测、学习路线、行业洞察等深度长文全部收录，共 {len(posts)} 篇。">
<meta charset="UTF-8">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>博客目录 · 白驹全局大脑</title>
<link rel="stylesheet" href="/theme-cloud.css">
<link rel="stylesheet" href="/site-redesign.css">
<style>
.hero{{position:relative;overflow:hidden;background:var(--hero-grad);padding:56px 24px 44px}}
.hero::before{{content:"";position:absolute;width:320px;height:320px;top:-60px;right:-40px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 70%);pointer-events:none}}
.hero::after{{content:"";position:absolute;width:260px;height:260px;bottom:-80px;left:-60px;border-radius:50%;background:radial-gradient(circle,rgba(180,230,255,.40),transparent 70%);pointer-events:none}}
.hero .inner{{position:relative;max-width:1080px;margin:0 auto;text-align:center;z-index:1}}
.badge{{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:99px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.38);color:#fff;font-size:13px;font-weight:700;backdrop-filter:blur(8px)}}
.hero h1{{font-size:clamp(30px,4.5vw,52px);font-weight:900;color:#fff;margin:14px 0 12px;letter-spacing:1px;text-shadow:0 2px 20px rgba(16,48,120,.30)}}
.hero .sub{{color:rgba(255,255,255,.95);font-size:15px;max-width:760px;margin:0 auto;text-shadow:0 1px 8px rgba(16,48,120,.30)}}
nav.top{{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:18px;padding:0 28px;height:64px;background:var(--nav-bg);backdrop-filter:blur(16px);border-bottom:1px solid var(--nav-line);box-shadow:var(--nav-shadow)}}
nav.top .brand{{font-size:17px;font-weight:900;display:flex;align-items:center;gap:9px}}
nav.top .brand .logo{{width:36px;height:36px;border-radius:10px;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;box-shadow:0 4px 10px rgba(79,140,255,.35)}}
nav.top .brand .nm{{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}}
nav.top .links{{display:flex;gap:2px;margin-left:12px;flex-wrap:wrap}}
nav.top .links a{{padding:9px 13px;border-radius:9px;font-size:14px;color:var(--muted);font-weight:600;white-space:nowrap;text-decoration:none}}
nav.top .links a:hover{{background:rgba(120,160,220,.12);color:var(--blue)}}
nav.top .links a.cur{{background:var(--grad);color:#fff;box-shadow:0 4px 12px rgba(79,140,255,.30)}}
nav.top .nav-actions{{display:flex;align-items:center;gap:10px;margin-left:auto}}
nav.top .theme-btn{{width:38px;height:38px;border-radius:99px;border:1px solid var(--line);background:var(--panel);color:var(--text);font-size:17px;cursor:pointer}}
section.block{{max-width:1180px;margin:36px auto;padding:0 20px}}
.sec-head{{display:flex;align-items:baseline;gap:12px;margin-bottom:18px;flex-wrap:wrap}}
.sec-head h2{{font-size:24px;font-weight:900}}
.sec-head h2 .em{{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}}
.sec-head .tag{{font-size:12px;color:var(--muted);background:rgba(120,160,220,.12);padding:4px 11px;border-radius:99px}}
.proj-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}}
.pcard{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;transition:.2s;box-shadow:var(--card-shadow);display:flex;flex-direction:column;gap:8px;text-decoration:none;color:inherit}}
.pcard:hover{{transform:translateY(-3px);box-shadow:var(--card-shadow-h);border-color:rgba(79,140,255,.4)}}
.pcard .pico{{width:40px;height:40px;border-radius:11px;background:linear-gradient(120deg,#f5c26b,#ff8c5a 50%,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 10px rgba(139,92,246,.22)}}
.pcard h4{{font-size:14.5px;font-weight:800}}
.pcard p{{font-size:12.5px;color:var(--muted);flex:1;line-height:1.6}}
.pcard .go{{font-size:12px;font-weight:700;color:var(--blue)}}
</style>
</head>
<body data-theme="cloud">
<nav class="top">
  <div class="brand"><span class="logo">🐎</span><span class="nm">白驹 · ccowork</span></div>
  <div class="links">
    <a href="../index.html">💬 首页</a>
    <a href="../website/hub.html">🌐 知识库</a>
    <a href="../website/ai-academy.html">🎓 AI 学院</a>
    <a href="index.html" class="cur">📝 博客</a>
  </div>
  <div class="nav-actions">
    <button class="theme-btn" id="themeBtn" title="切换亮暗主题">🌙</button>
  </div>
</nav>
<section class="hero">
  <div class="inner">
    <div class="badge">🐎 白驹 · 全局大脑 · 博客目录</div>
    <h1>{len(posts)} 篇深度长文</h1>
    <p class="sub">AI 创业复盘 · 工具横评实测 · 学习路线验证 · 行业应用指南 · 前沿洞察 —— 全部真实可核验，按需取读。</p>
  </div>
</section>
<section class="block">
  <div class="sec-head"><h2><span class="em">全部文章</span></h2><span class="tag">{len(posts)} 篇 · 持续更新</span></div>
  <div class="proj-grid">
    {grid}
  </div>
</section>
<footer>
  <div class="foot-inner">
    <div class="foot-brand">
      <div class="logo-row"><span class="logo">🐎</span><b>白驹 · ccowork</b></div>
      <p>博客目录：把散落的 AI 洞察装进一个大脑。</p>
    </div>
    <div class="foot-col"><b>入口</b><a href="../website/ai-academy.html">AI 学院</a><a href="../website/ai-academy-journey.html">成长故事曲线</a><a href="../website/ai-academy-roadmap.html">学习路线图</a></div>
    <div class="foot-col"><b>资源</b><a href="../website/ai-academy-projects.html">毕业设计项目库</a><a href="../website/ai-academy-jobs.html">岗位地图</a><a href="../website/ai-academy-interview.html">面试题库</a></div>
  </div>
  <div class="foot-bar"><span>© 2026 ccowork · 白驹全局大脑</span><span>内容原创或标注出处 · 不侵犯作者权益</span></div>
</footer>
<script src="/ccowork.js"></script>
<script src="/module.js"></script>
<script>
function ccoworkTheme(){{var cur=document.body.getAttribute('data-theme')||'cloud';var next=cur==='cloud'?'deep':'cloud';document.body.setAttribute('data-theme',next);try{{localStorage.setItem('ccowork.theme',next)}}catch(e){{}}var b=document.getElementById('themeBtn');if(b)b.textContent=next==='deep'?'☀️':'🌙';}}
document.addEventListener('DOMContentLoaded',function(){{var t=document.body.getAttribute('data-theme')||'cloud';var b=document.getElementById('themeBtn');if(b)b.textContent=t==='deep'?'☀️':'🌙';}});
</script>
</body>
</html>'''

def main():
    files = sorted(glob.glob(os.path.join(BLOG, '*.html')))
    files = [f for f in files if os.path.basename(f) != 'index.html']
    files.sort(key=lambda f: os.path.getmtime(f), reverse=True)
    posts = [(f, title_of(f)) for f in files]
    ok = skip = 0
    for i, (f, _) in enumerate(posts):
        prev = posts[i + 1][0] if i + 1 < len(posts) else None
        nextp = posts[i - 1][0] if i - 1 >= 0 else None
        r = inject_post(f, prev, nextp)
        if r == 'ok': ok += 1
        else: skip += 1
    idx = os.path.join(BLOG, 'index.html')
    open(idx, 'w', encoding='utf-8').write(gen_index(posts))
    print(f'✅ 博文处理：注入 {ok} · 跳过 {skip} · 目录页已生成（{len(posts)} 篇）')

if __name__ == '__main__':
    main()
