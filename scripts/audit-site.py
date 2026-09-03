#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全站内容体检：占位空壳 / 死链 / 孤儿页 / 无图页 / 品牌不一致 / 缺出处 / 结构薄"""
import os, re, sys, json
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__)) + '/..'
SKIP_DIRS = {'deploy', 'node_modules', '.git', 'assets', 'img'}

def walk():
    pages = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP_DIRS and not d.startswith('.')]
        for f in fns:
            if f.endswith('.html'):
                pages.append(os.path.join(dp, f))
    return pages

PLACEHOLDER = re.compile(r'占位|即将上线|敬请期待|TODO|待集成|待上线|施工中|Coming soon|Lorem')
def analyze(p):
    rel = os.path.relpath(p, ROOT).replace('\\', '/')
    try:
        html = open(p, encoding='utf-8', errors='ignore').read()
    except Exception as e:
        return {'rel': rel, 'err': str(e)}
    size = os.path.getsize(p)
    h1 = len(re.findall(r'<h1[ >]', html))
    h2 = len(re.findall(r'<h2[ >]', html))
    imgs = len(re.findall(r'<img[ >]', html))
    svgs = len(re.findall(r'<svg[ >]', html))
    ext_imgs = len(re.findall(r'<img[^>]+src="https?://', html))
    local_imgs = imgs - ext_imgs
    has_ccowork = 'ccowork.js' in html
    has_module = 'module.js' in html
    has_theme = 'theme-cloud.css' in html
    has_redesign = 'site-redesign.css' in html
    has_attrib = bool(re.search(r'开源|MIT|来源|出处|Datawhale|Hello-Agents|版权|©', html))
    is_placeholder = bool(PLACEHOLDER.search(html)) and size < 20000
    # 收集内部链接
    links = set()
    base = os.path.dirname(rel)
    for m in re.finditer(r'href="([^"#]+?)\.html(?:[^"]*)"', html):
        t = m.group(1) + '.html'
        links.add(t)
    return {'rel': rel, 'size': size, 'h1': h1, 'h2': h2, 'imgs': imgs, 'svgs': svgs,
            'ext_imgs': ext_imgs, 'has_ccowork': has_ccowork, 'has_module': has_module,
            'has_theme': has_theme, 'has_redesign': has_redesign, 'has_attrib': has_attrib,
            'is_placeholder': is_placeholder, 'links': links}

def norm(p):
    p = p.replace('\\', '/')
    while '/./' in p: p = p.replace('/./', '/')
    while p.startswith('../'): p = p[3:]
    return p

def main():
    pages = walk()
    infos = []
    for p in pages:
        infos.append(analyze(p))
    # 建立磁盘文件集合（相对路径）
    disk = set()
    for inf in infos:
        if 'err' not in inf:
            disk.add(inf['rel'])
    # 全量链接图
    inbound = defaultdict(set)
    dead = []
    for inf in infos:
        if 'err' in inf: continue
        base_dir = os.path.dirname(inf['rel'])
        for t in inf['links']:
            tgt = norm(os.path.normpath(os.path.join(base_dir, t)))
            if tgt in disk:
                inbound[tgt].add(inf['rel'])
            else:
                dead.append((inf['rel'], t))
    orphans = [inf['rel'] for inf in infos if 'err' not in inf and inf['rel'] not in inbound and inf['rel'] != 'index.html' and not inf['is_placeholder']]
    print('='*70)
    print(f'全站 HTML 总数: {len(pages)}')
    # 1) 占位/空壳
    ph = [i for i in infos if i.get('is_placeholder')]
    print(f'\n[1] 疑似占位/空壳页 ({len(ph)}):')
    for i in ph[:15]: print(f'   {i["rel"]} ({i["size"]}B)')
    # 2) 死链
    print(f'\n[2] 死链（目标文件不存在）({len(dead)}):')
    for src, tgt in dead[:20]: print(f'   {src} -> {tgt}')
    # 3) 孤儿页（无任何入链、非首页、非占位）
    print(f'\n[3] 孤儿页（零入链）({len(orphans)}):')
    for o in orphans[:30]: print(f'   {o}')
    # 4) 品牌不一致（内容页缺 ccowork.js 或 module.js 或双主题）
    no_brand = [i for i in infos if 'err' not in i and not i['is_placeholder'] and (not i['has_ccowork'] or not i['has_theme'])]
    print(f'\n[4] 品牌不一致（缺 ccowork.js 或 theme-cloud.css）({len(no_brand)}):')
    for i in no_brand[:20]: print(f'   {i["rel"]} (ccowork={i["has_ccowork"]} theme={i["has_theme"]} module={i["has_module"]})')
    # 5) 无图内容页（h1/h2 有内容但零图零SVG）
    no_img = [i for i in infos if 'err' not in i and i['h1']>=1 and i['h2']>=2 and i['imgs']==0 and i['svgs']==0]
    print(f'\n[5] 无图长文页（h2>=2 且零图）({len(no_img)}):')
    for i in no_img[:25]: print(f'   {i["rel"]} (h2={i["h2"]})')
    # 6) 缺出处（长文页无 来源/MIT/开源 标注）
    no_attrib = [i for i in infos if 'err' not in i and i['h1']>=1 and i['h2']>=2 and not i['has_attrib']]
    print(f'\n[6] 缺出处标注的长文页 ({len(no_attrib)}):')
    for i in no_attrib[:20]: print(f'   {i["rel"]}')
    # 7) 结构薄（h2 极少的大文件？反过来说：>30KB 但 h2==0）
    thin = [i for i in infos if 'err' not in i and i['size']>30000 and i['h2']==0]
    print(f'\n[7] 大文件但无 h2 结构 ({len(thin)}):')
    for i in thin[:15]: print(f'   {i["rel"]} ({i["size"]}B, h1={i["h1"]})')
    # 分目录统计
    dirs = defaultdict(lambda: [0,0])
    for i in infos:
        if 'err' in i: continue
        d = i['rel'].split('/')[0] if '/' in i['rel'] else '(root)'
        dirs[d][0]+=1; dirs[d][1]+=i['size']
    print('\n[8] 分目录页面数:')
    for d,(n,s) in sorted(dirs.items(), key=lambda x:-x[1][0]):
        print(f'   {d}: {n} 页 ({s//1024}KB)')

if __name__ == '__main__':
    main()
