# -*- coding: utf-8 -*-
"""把 4 个数据文件内联进 AI学院 相关页面，解决预览/线上渲染为 0 的问题。

原因：页面用 <script src="/data/xxx.js"> 外部加载，一旦该脚本未加载（预览服务、
路径差异、弱网），渲染逻辑拿不到数据就显示 0。内联后 100% 可用。
数据文件仍保留为「单一数据源」，更新数据后重跑本脚本即可重新内联。
"""
import io, os, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_FILES = {
    'intl-ai-resources.js': 'data/intl-ai-resources.js',
    'national-ai-education.js': 'data/national-ai-education.js',
    'ai-papers.js': 'data/ai-papers.js',
    'ai-courses.js': 'data/ai-courses.js',
}

PAGES = [
    'website/ai-academy.html',
    'website/ai-academy-resources.html',
    'website/ai-academy-national.html',
    'website/ai-academy-newsroom.html',
]

# 载入数据文件内容
contents = {}
for key, fp in DATA_FILES.items():
    if os.path.exists(fp):
        contents[key] = open(fp, encoding='utf-8').read()
        print(f'📦 载入 {key}: {len(contents[key])}B')
    else:
        print(f'⚠️ 缺失 {fp}')
        contents[key] = None

total = 0
for page in PAGES:
    if not os.path.exists(page):
        print('⚠️ 页面不存在:', page)
        continue
    html = open(page, encoding='utf-8').read()
    orig = html
    for key, content in contents.items():
        if not content:
            continue
        # 匹配该页面里的外链 script 标签并替换为内联
        pat = re.compile(r'<script src="/data/' + re.escape(key) + r'"></script>')
        if pat.search(html):
            inline = '<script>\n/* 数据内联（自动生���，勿手改；源文件 data/' + key + '） */\n' + content + '\n</script>'
            html = pat.sub(lambda m: inline, html)
            print(f'  ✅ {page}: 内联 {key}')
        # 已内联的（重复跑）跳过
    if html != orig:
        open(page, 'w', encoding='utf-8').write(html)
        total += 1

print(f'\n共更新 {total} 个页面')
