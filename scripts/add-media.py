# -*- coding: utf-8 -*-
"""给三大分馆接入 hero 配图 + 语音朗读系统"""
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CONF = [
    ('website/ai-academy-resources.html', 'ai-academy/assets/resources-hall.png', '权威资源馆主视觉'),
    ('website/ai-academy-national.html', 'ai-academy/assets/national-hall.png', '国家 AI 教育馆主视觉'),
    ('website/ai-academy-newsroom.html', 'ai-academy/assets/newsroom-hall.png', 'AI 大事记馆主视觉'),
]

IMG_TPL = ('\n<img src="{src}" alt="{alt}" loading="lazy" '
           'style="width:min(880px,96%);border-radius:18px;margin:22px auto 6px;display:block;'
           'box-shadow:0 14px 38px rgba(16,48,120,.28)">'
           '\n<p style="text-align:center;font-size:11px;color:var(--muted);margin:6px 0 0">'
           '🎨 配图由 AI 生成（ImageGen）· 仅作视觉装饰，非实物照片</p>\n')

for fp, src, alt in CONF:
    html = open(fp, encoding='utf-8').read()
    changed = False
    # 1) 插配图：放在结尾 h1 之后
    if src not in html:
        m = re.search(r'(<h1>[^<]*馆[^<]*</h1>\n)', html)
        if not m:
            m = re.search(r'(<h1>[^<]*</h1>\n)', html)
        if m:
            html = html[:m.end()] + IMG_TPL.format(src=src, alt=alt) + html[m.end():]
            changed = True
            print(f'🖼 {fp}: 配图已插入')
        else:
            print(f'⚠️ {fp}: 未找到 h1 插入点')
    # 2) 接语音朗读
    if 'speak.js' not in html:
        html = html.replace('<script src="/module.js"></script>',
                            '<script src="/module.js"></script>\n<script src="/speak.js"></script>', 1)
        changed = True
        print(f'🔊 {fp}: 语音朗读已接入')
    if changed:
        open(fp, 'w', encoding='utf-8').write(html)

# 门户也接语音朗读
fp = 'website/ai-academy.html'
html = open(fp, encoding='utf-8').read()
if 'speak.js' not in html:
    html = html.replace('<script src="/module.js"></script>',
                        '<script src="/module.js"></script>\n<script src="/speak.js"></script>', 1)
    open(fp, 'w', encoding='utf-8').write(html)
    print(f'🔊 {fp}: 语音朗读已接入')

print('\n完成')
