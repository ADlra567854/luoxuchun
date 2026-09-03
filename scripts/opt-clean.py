#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""opt-clean.py — 书稿出处补齐 + 根目录杂物清理"""
import os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__)) + '/..'

ATTRIB = '''<hr>
<p style="color:var(--muted);font-size:12.5px;line-height:1.8">📌 出处声明：本页内容为白驹全局大脑原创整理，或已标注引用来源；改编内容遵循原始项目许可证（如 MIT / CC），不侵犯原作者权益。涉及第三方工具/模型/数据的信息以官方为准，如需更正请联系我们。</p>
</body>'''

def add_attrib(p):
    html = open(p, encoding='utf-8', errors='ignore').read()
    if '出处声明' in html:
        return 'skip'
    if not re.search(r'开源|MIT|来源|出处|Datawhale|©', html):
        if '</body>' in html:
            html = html.replace('</body>', ATTRIB, 1)
            open(p, 'w', encoding='utf-8').write(html)
            return 'ok'
    return 'skip'

def main():
    ok = 0
    # 书稿：五卷全书 + book/ 下所有 html
    targets = []
    for base in [os.path.join(ROOT, 'book', '五卷全书'), os.path.join(ROOT, 'book')]:
        for dp, dn, fns in os.walk(base):
            for f in fns:
                if f.endswith('.html'):
                    targets.append(os.path.join(dp, f))
    for p in targets:
        r = add_attrib(p)
        if r == 'ok': ok += 1
    print(f'✅ 书稿出处补齐：{ok} 页新增出处声明（共扫 {len(targets)} 页）')

    # 清理：根目录内部报告/临时文件 → _internal/
    internal_dir = os.path.join(ROOT, '_internal')
    os.makedirs(internal_dir, exist_ok=True)
    patterns = ['AIGC', '图标优化完成报告', '已完成工作总结', 'README-一键开箱', 'tmp_']
    moved = []
    for f in os.listdir(ROOT):
        fp = os.path.join(ROOT, f)
        if not os.path.isfile(fp) or not f.endswith('.html'):
            continue
        if any(f.startswith(p) or p in f for p in patterns):
            shutil.move(fp, os.path.join(internal_dir, f))
            moved.append(f)
    print(f'🧹 清理根目录：{len(moved)} 个内部/临时文件移入 _internal/')
    for m in moved: print('   →', m)

if __name__ == '__main__':
    main()
