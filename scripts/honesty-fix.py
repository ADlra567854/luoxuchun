# -*- coding: utf-8 -*-
"""内容诚实化改造：摘掉『真实可核验』假标，改为『AI 生成 · 信息以官方为准』"""
import re, glob, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CHANGED = 0
OLD_PATTERNS = [
    # 现有各种真实可核验徽章写法
    '<span class="blog-tag" style="background:rgba(56,225,255,.12);color:var(--cyan)">✅ 真实可核验</span>',
    '<span class="blog-tag">✅ 真实可核验</span>',
]
NEW_BADGE = '<span class="blog-tag" style="background:rgba(250,204,21,.14);color:#d97706;border:1px dashed rgba(217,119,6,.4)">🤖 AI 生成 · 以官方为准</span>'

# 目标文件：博文 + 学院章节 + 项目页 + 支撑页
targets = []
targets += glob.glob('blog/*.html')
targets += glob.glob('website/ai-academy/chapter-*.html')
targets += glob.glob('website/ai-academy/projects/*.html')
targets += glob.glob('website/ai-academy-*.html')

for fp in targets:
    try:
        html = open(fp, encoding='utf-8').read()
    except Exception:
        continue
    orig = html
    for pat in OLD_PATTERNS:
        if pat in html:
            html = html.replace(pat, NEW_BADGE)
    if html != orig:
        open(fp, 'w', encoding='utf-8').write(html)
        CHANGED += 1
        print('✅ 改标:', fp)

print(f'\n共改 {CHANGED} 个文件')

# news.js 头部加 AI 生成声明
nfp = 'data/news.js'
nhtml = open(nfp, encoding='utf-8').read()
if 'AI 生成' not in nhtml.split('\n')[0:5].__str__() and 'AI 生成' not in nhtml[:400]:
    header = '/* ⚠️ 本文件新闻由 AI 生成整理，信息请以官方发布为准；每条新闻非人工核实，可能存在不准确处。 */\n'
    open(nfp, 'w', encoding='utf-8').write(header + nhtml)
    print('✅ news.js 头部加 AI 生成声明')
else:
    print('ℹ️ news.js 已有声明')
