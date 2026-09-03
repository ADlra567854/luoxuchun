# -*- coding: utf-8 -*-
"""修复门户：STAGE 占位改真链接 + 工业美学静态直连"""
import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

fp = 'website/ai-academy.html'
html = open(fp, encoding='utf-8').read()

# ---------- 1) STAGE 01-04 span 占位 → 真链接 ----------
chip = '<a href="{url}" style="font-size:11px;color:#2563eb;background:rgba(120,160,220,.10);border:1px solid rgba(120,160,220,.18);border-radius:99px;padding:3px 10px;font-weight:600;text-decoration:none">{txt}</a>'

stage_map = [
    # (旧 span 列表, 新链接列表)
    (['AI 认知与伦理', 'LLM 原理', '提示词基础', 'Python 基础'],
     [('ai-academy/chapter-01.html', 'AI 认知与伦理'),
      ('ai-academy/chapter-03.html', 'LLM 原理'),
      ('ai-academy/chapter-17.html', '提示词基础'),
      ('ai-academy/chapter-22.html', 'Python 基础')]),
    (['智能体基础', 'ReAct 范式', '框架实践', '低代码搭建'],
     [('ai-academy/chapter-01.html', '智能体基础'),
      ('ai-academy/chapter-04.html', 'ReAct 范式'),
      ('ai-academy/chapter-06.html', '框架实践'),
      ('ai-academy/chapter-05.html', '低代码搭建')]),
    (['RAG', '上下文工程', '微调与部署', '多模态 AIGC'],
     [('ai-academy/chapter-19.html', 'RAG'),
      ('ai-academy/chapter-09.html', '上下文工程'),
      ('ai-academy/chapter-20.html', '微调与部署'),
      ('ai-academy/chapter-21.html', '多模态 AIGC')]),
    (['职场应用', '行业落地', '毕业设计', '面试认证'],
     [('ai-academy/chapter-23.html', '职场应用'),
      ('ai-academy/chapter-24.html', '行业落地'),
      ('ai-academy-projects.html', '毕业设计'),
      ('ai-academy-interview.html', '面试认证')]),
]

for old_spans, new_links in stage_map:
    old_html = '<div class="chs">' + ''.join(f'<span>{s}</span>' for s in old_spans) + '</div>'
    if old_html in html:
        new_html = '<div class="chs">' + ''.join(chip.format(url=u, txt=t) for u, t in new_links) + '</div>'
        html = html.replace(old_html, new_html, 1)
        print('✅ STAGE 修复:', ' '.join(old_spans))
    else:
        print('⚠️ 未匹配:', old_spans)

# ---------- 2) <head> 静态引用工业美学 ----------
if 'site-industrial.css' not in html:
    html = html.replace(
        '<link rel="stylesheet" href="/site-redesign.css">',
        '<link rel="stylesheet" href="/site-redesign.css">\n<link rel="stylesheet" href="/site-industrial.css">', 1)
    print('✅ 工业美学静态直连已加入 <head>')
else:
    print('ℹ️ 工业美学已在 head 中')

open(fp, 'w', encoding='utf-8').write(html)
print('完成')
