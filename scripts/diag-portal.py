# -*- coding: utf-8 -*-
"""诊断 AI学院 门户：课程地图 chs 区块完整结构"""
import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

html = open('website/ai-academy.html', encoding='utf-8').read()

# 1) 所有 chs 区块完整 dump
chs_blocks = re.findall(r'<div class="chs">(.*?)</div>', html, re.S)
print('=== chs 区块数:', len(chs_blocks), '===')
for i, b in enumerate(chs_blocks, 1):
    links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>([^<]*)</a>', b)
    spans = re.findall(r'<span[^>]*>([^<]*)</span>', b)
    # 找出既不是 a 也不是 span 的裸文本
    stripped = re.sub(r'<a[^>]*>.*?</a>', '', b, flags=re.S)
    stripped = re.sub(r'<span[^>]*>.*?</span>', '', stripped, flags=re.S)
    bare = [t.strip() for t in stripped.replace('\n', ' ').split() if t.strip()]
    flag = ''
    if not links: flag += ' ⚠️无链接'
    if spans: flag += f' ⚠️span占位:{spans}'
    if bare: flag += f' ⚠️裸文本:{bare}'
    print(f'chs#{i}: <a>={len(links)} {flag}')
    for h, t in links:
        print(f'    {h} -> {t}')

# 2) 九大部分卡片标题
print('\n=== PART 卡片 ===')
parts = re.findall(r'<div class="pno">(.*?)</div>\s*<h3>(.*?)</h3>', html, re.S)
for i, (pno, h3) in enumerate(parts, 1):
    print(f'  {pno.strip()} | {h3.strip()}')
print('PART 数:', len(parts))

# 3) 所有章节文件 vs 门户链接覆盖
import os
files = sorted(f for f in os.listdir('website/ai-academy') if f.startswith('chapter-') and f.endswith('.html'))
all_linked = set(re.findall(r'href="ai-academy/(chapter-\d+\.html)"', html))
print('\n=== 章节覆盖 ===')
print('文件数:', len(files), '| 门户链接到:', len(all_linked))
for f in files:
    if f not in all_linked:
        print('  ❌ 未链接:', f)
