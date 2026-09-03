# -*- coding: utf-8 -*-
"""
gen-book-epub3.py · B3 三期：三本 EPUB 导出（零依赖，仅 Python 标准库）
==================================================================
书目：
  1. 《中国科技故事》—— book/五卷全书/中国科技故事/ 18 篇 + README 总目录（19 章）
  2. 《对齐之路》—— book/对齐之路.html（单本 1 章）
  3. 《具身智能》—— book/具身智能.html（单本 1 章）

- 复用 gen-book-epub2.py 的 XHTML/OPF/NCX 生成逻辑，输出 website/book/<书名>.epub
- 正文复用 <article>，不编造；剥离「白驹 · 全局大脑 · 五卷全书 日期 N 分钟」开篇元信息
- 用法: python scripts/gen-book-epub3.py [--dry] [--only 中国科技故事|对齐之路|具身智能]
"""
import io, os, re, sys, zipfile, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOL_DIR = os.path.join(ROOT, 'book', '五卷全书')
STORY_DIR = os.path.join(VOL_DIR, '中国科技故事')
OUT_DIR = os.path.join(ROOT, 'website', 'book')

CSS = """\
body{font-family:"Source Han Serif SC","Noto Serif SC","Songti SC",serif;line-height:1.75;color:#1a1a1a;margin:0;padding:0}
h1{font-size:1.55em;line-height:1.4;margin:0.2em 0 0.6em;border-bottom:2px solid #d0d0d0;padding-bottom:0.3em}
h2{font-size:1.25em;margin:1.2em 0 0.5em;color:#222}
h3{font-size:1.1em;margin:1em 0 0.4em;color:#333}
p{margin:0.55em 0;text-align:justify}
ul,ol{padding-left:1.4em;margin:0.5em 0}
li{margin:0.3em 0}
blockquote{margin:0.7em 0;padding:0.5em 1em;border-left:3px solid #888;background:#f4f4f4;color:#333}
pre{font-family:Consolas,monospace;font-size:0.85em;background:#f6f6f6;border:1px solid #ddd;border-radius:6px;padding:0.8em;overflow-wrap:break-word;white-space:pre-wrap;margin:0.7em 0}
code{font-family:Consolas,monospace;font-size:0.9em;background:#f2f2f2;padding:0.1em 0.3em;border-radius:3px}
table{border-collapse:collapse;width:100%;margin:0.8em 0;font-size:0.92em}
th,td{border:1px solid #bbb;padding:0.45em 0.6em;text-align:left}
th{background:#eee}
hr{border:none;border-top:1px solid #ccc;margin:1.2em 0}
img{max-width:100%}
"""

def strip_tags(html, keep=('h1','h2','h3','p','ul','ol','li','pre','code','table','thead','tbody','tr','th','td','blockquote','strong','em','b','i','hr','br','div','span','sup','sub')):
    html = re.sub(r'<script[\s\S]*?</script>', '', html, flags=re.I)
    html = re.sub(r'<style[\s\S]*?</style>', '', html, flags=re.I)
    html = re.sub(r'<iframe[\s\S]*?</iframe>', '', html, flags=re.I)
    html = re.sub(r'<nav[\s\S]*?</nav>', '', html, flags=re.I)
    html = re.sub(r'<svg[\s\S]*?</svg>', '', html, flags=re.I)
    html = re.sub(r'\s+(?:style|class|id|data-[a-z-]+|width|height|align|valign|border|cellpadding|cellspacing)="[^"]*"', '', html, flags=re.I)
    html = re.sub(r'<a\b[^>]*>([\s\S]*?)</a>', r'\1', html, flags=re.I)
    html = re.sub(r'<img\b[^>]*src="[^"]*"[^>]*/?>', '', html, flags=re.I)
    html = re.sub(r'<(?!\/?(?:' + '|'.join(keep) + r')\b)[^>]*>', '', html, flags=re.I)
    # 空元素自闭合（XHTML 要求 <br/> <hr/>）
    html = re.sub(r'<(hr|br)\b(?![^>]*/>)([^>]*)>', r'<\1\2/>', html, flags=re.I)
    # 转义裸 &（保护已有实体：&amp; &lt; 等，XHTML 要求 & 后必须跟实体名）
    html = re.sub(r'&(?!(?:amp|lt|gt|quot|apos|nbsp|copy|reg|hellip|mdash|ndash|middot|#\d+|#x[0-9a-fA-F]+);)', '&amp;', html)
    html = re.sub(r'\s+', ' ', html)
    return html.strip()

def extract_article(path):
    with io.open(path, encoding='utf-8', errors='replace') as fh:
        html = fh.read()
    m = re.search(r'<article[\s>][\s\S]*?</article>', html, re.I)
    seg = m.group(0) if m else (re.search(r'<main[\s>][\s\S]*?</main>', html, re.I) or [None])[0]
    if not seg:
        seg = (re.search(r'<body[\s>][\s\S]*?</body>', html, re.I) or ['', ''])[0]
    body = strip_tags(seg)
    # 剥离「白驹 · 全局大脑 · 五卷全书 日期 N 分钟 五卷全书」开篇元信息
    body = re.sub(r'^(白驹\s*[··]\s*全局大脑\s*[··]\s*[^，。！？!?\s]*\s*\d{4}-\d{2}-\d{2}\s*\d+\s*分钟\s*[^，。！？!?]*[。！？!?]?\s*)', '', body, flags=re.I)
    h1 = re.search(r'<h1[^>]*>([\s\S]*?)</h1>', body, re.I)
    title = re.sub(r'<[^>]+>', '', h1.group(1)).strip() if h1 else os.path.splitext(os.path.basename(path))[0]
    return title, body

def xhtml_doc(title, body, css_href='../styles.css'):
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html>\n'
            '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">\n'
            '<head><title>' + esc(title) + '</title>\n'
            '<link rel="stylesheet" type="text/css" href="' + css_href + '"/></head>\n'
            '<body>\n' + body + '\n</body></html>')

def esc(s):
    return (str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            .replace('"', '&quot;').replace("'", '&apos;'))

# ---------------- 书目定义 ----------------
# 每本: (输出文件名, EPUB 标题, 副标题, 章节文件列表[(路径, 是否带元信息剥离)])
BOOKS = [
    (
        '中国科技故事.epub',
        '中国科技故事 · 从 DeepSeek 到钱学森',
        '白驹全局大脑 · ccowork 出品',
        [('README-目录.html', True)] + [('{:02d}-{}.html'.format(i, n), True) for i, n in [
            (1, 'DeepSeek的逆袭'), (2, '两弹一星'), (3, '中国高铁'), (4, '北斗导航'), (5, '中国航天'),
            (6, '嫦娥探月'), (7, '超级计算机'), (8, '量子科技'), (9, '华为'), (10, '5G通信'),
            (11, '移动支付'), (12, '大疆'), (13, '比亚迪'), (14, '国产大模型群像'), (15, '光刻机与芯片'),
            (16, '钱学森'), (17, '袁隆平'), (18, '科技创业者群像')]],
    ),
    (
        '对齐之路.epub',
        '对齐之路 · AI 安全与人类的抉择',
        '白驹全局大脑 · ccowork 出品',
        [('对齐之路.html', True)],
    ),
    (
        '具身智能.epub',
        '具身智能 · 当 AI 拥有了身体',
        '白驹全局大脑 · ccowork 出品',
        [('具身智能.html', True)],
    ),
]

def build_book(book_def, dry=False, only=None):
    out_name, book_title, book_subtitle, chapter_list = book_def
    if only and only not in out_name and only not in book_title:
        return None
    chapters = []
    missing = []
    for rel, strip_meta in chapter_list:
        if rel.startswith('README') or rel.startswith('0') or rel[0].isdigit():
            fp = os.path.join(STORY_DIR, rel)
        else:
            fp = os.path.join(ROOT, 'book', rel)
        if not os.path.exists(fp):
            missing.append(rel)
            continue
        title, body = extract_article(fp)
        chapters.append((rel, title, body))
    if missing:
        print('[warn] 缺失文件:', missing)

    oebps = []
    oebps.append(('OEBPS/styles.css', CSS))
    oebps.append(('OEBPS/cover.xhtml', xhtml_doc(book_title,
        '<div style="text-align:center;margin-top:28%;"><h1 style="border:none">' + esc(book_title) + '</h1>'
        '<p style="color:#666">' + esc(book_subtitle) + '</p><hr style="width:40%"/>'
        '<p style="font-size:0.9em;color:#999">全书 ' + str(len(chapters)) + ' 章 · 复用于白驹站点书系</p></div>')))

    manifest = ['styles.css', 'cover.xhtml', 'nav.xhtml', 'toc.ncx']
    spine = ['cover.xhtml']
    nav_items = []
    for i, (name, title, body) in enumerate(chapters, start=1):
        fname = 'ch' + str(i).zfill(2) + '.xhtml'
        oebps.append(('OEBPS/chapters/' + fname, xhtml_doc(title, body)))
        manifest.append('chapters/' + fname)
        spine.append('chapters/' + fname)
        nav_items.append((title, 'chapters/' + fname))

    nav_html = ('<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">\n'
        '<head><title>目录</title></head><body>\n<nav epub:type="toc" id="toc"><h1>目录</h1><ol>\n' +
        ''.join('<li><a href="' + href + '">' + esc(t) + '</a></li>\n' for t, href in nav_items) +
        '</ol></nav></body></html>')
    oebps.append(('OEBPS/nav.xhtml', nav_html))

    ncx = ('<?xml version="1.0" encoding="utf-8"?>\n'
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n'
        '<head><meta name="dtb:uid" content="urn:uuid:baiju-' + hashlib.md5(out_name.encode()).hexdigest()[:8] + '"/></head>\n'
        '<docTitle><text>' + esc(book_title) + '</text></docTitle>\n<navMap>\n' +
        ''.join('<navPoint id="np' + str(i) + '" playOrder="' + str(i) + '"><navLabel><text>' + esc(t) + '</text></navLabel><content src="' + href + '"/></navPoint>\n'
                for i, (t, href) in enumerate(nav_items, start=1)) +
        '</navMap></ncx>')
    oebps.append(('OEBPS/toc.ncx', ncx))

    manifest_xml = ''.join('<item id="m' + str(i) + '" href="' + h + '" media-type="' +
        ('application/xhtml+xml' if h.endswith('.xhtml') else ('text/css' if h.endswith('.css') else 'application/x-dtbncx+xml')) + '"/>'
        for i, h in enumerate(manifest, start=1))
    spine_xml = ''.join('<itemref idref="m' + str(i) + '"/>' for i in range(1, len(spine) + 1))
    opf = ('<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="zh-CN">\n'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
        '<dc:identifier id="uid">urn:uuid:baiju-' + hashlib.md5(out_name.encode()).hexdigest()[:8] + '</dc:identifier>\n'
        '<dc:title>' + esc(book_title) + '</dc:title>\n'
        '<dc:creator>' + esc(book_subtitle.split(' · ')[0] if ' · ' in book_subtitle else '白驹全局大脑 · ccowork') + '</dc:creator>\n'
        '<dc:language>zh-CN</dc:language>\n'
        '<meta property="dcterms:modified">2026-09-01T00:00:00Z</meta>\n'
        '</metadata>\n'
        '<manifest>\n' + manifest_xml + '\n</manifest>\n'
        '<spine toc="ncx">\n' + spine_xml + '\n</spine>\n</package>')
    oebps.append(('OEBPS/content.opf', opf))

    container = ('<?xml version="1.0" encoding="utf-8"?>\n'
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n</container>')

    out_path = os.path.join(OUT_DIR, out_name)
    if dry:
        print('[dry]', out_name, '| 章节数:', len(chapters), '| 输出:', out_path)
        for t, _ in nav_items[:5]:
            print('  -', t)
        if len(nav_items) > 5:
            print('  ... 共', len(nav_items), '章')
        return out_path

    os.makedirs(OUT_DIR, exist_ok=True)
    with zipfile.ZipFile(out_path, 'w') as z:
        z.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        z.writestr('META-INF/container.xml', container, compress_type=zipfile.ZIP_DEFLATED)
        for name, data in oebps:
            z.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)

    size = os.path.getsize(out_path)
    sha = hashlib.sha256(open(out_path, 'rb').read()).hexdigest()[:12]
    print('✅ EPUB 生成:', out_path)
    print('   章节数:', len(chapters), '| 大小:', round(size / 1024, 1), 'KB | sha256:', sha)
    return out_path

if __name__ == '__main__':
    dry = '--dry' in sys.argv
    only = None
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1]
    produced = []
    for b in BOOKS:
        p = build_book(b, dry, only)
        if p:
            produced.append(p)
    if not produced:
        print('未找到匹配书目（--only 值: %s）' % only)
        sys.exit(1)
    print('\n完成:', ', '.join(produced) if not dry else 'dry 模式，未写盘')
