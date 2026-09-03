# -*- coding: utf-8 -*-
"""
gen-book-epub2.py · 《五卷全书·选集》EPUB 3.0 导出（零依赖，仅 Python 标准库）
==================================================================
- 复用 book/五卷全书/*.html 的 <article> 正文，不编造内容
- 章节顺序：README 总目录 → 总序 → 科技史 → 三本工具书 → 第五/六卷 → 三附录
- 输出: website/book/五卷全书.epub（与 AI实战全书.epub 同级，便于书库页下载入口）
- 用法: python scripts/gen-book-epub2.py [--dry] [--out <path>]
"""
import io, os, re, sys, zipfile, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOL_DIR = os.path.join(ROOT, 'book', '五卷全书')
DEFAULT_OUT = os.path.join(ROOT, 'website', 'book', '五卷全书.epub')

BOOK_TITLE = '五卷全书 · 从 AI 工具到思想者的完整路线'
BOOK_SUBTITLE = '白驹全局大脑 · ccowork 出品'
BOOK_CREATOR = '白驹全局大脑 · ccowork'
BOOK_LANG = 'zh-CN'

# 章节文件（显式顺序：总目录导读 → 总序 → 正文 → 附录）
chapter_files = [
    'README-全书总目录.html',
    '总序.html',
    '从古至今科技史与AI发展历程.html',
    'AI工具大全-百科全书.html',
    'AI绘画实战-从文字到画面.html',
    'AI视频制作实战-一个人做出一条视频.html',
    '第五卷-如何用AI打造个人主流IP.html',
    '第六卷-AI思想者与未来图景.html',
    '附录-学习路线图.html',
    '附录-工具速查表.html',
    '附录-提示词模板库.html',
]

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
    html = re.sub(r'\s+(?:style|class|id|data-[a-z-]+|width|height|align|valign|border|cellpadding|cellspacing)="[^"]*"', '', html, flags=re.I)
    html = re.sub(r'<a\b[^>]*>([\s\S]*?)</a>', r'\1', html, flags=re.I)
    html = re.sub(r'<img\b[^>]*src="[^"]*"[^>]*/?>', '', html, flags=re.I)
    html = re.sub(r'<(?!\/?(?:' + '|'.join(keep) + r')\b)[^>]*>', '', html, flags=re.I)
    # 6) 空元素自闭合（XHTML 要求 <br/> <hr/>，避免 XML mismatched tag）
    html = re.sub(r'<(hr|br)\b(?![^>]*/>)([^>]*)>', r'<\1\2/>', html, flags=re.I)
    # 7) 自闭合/换行整理
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

def build(out_path, dry=False):
    chapters = []
    missing = []
    for name in chapter_files:
        fp = os.path.join(VOL_DIR, name)
        if not os.path.exists(fp):
            missing.append(name)
            continue
        title, body = extract_article(fp)
        chapters.append((name, title, body))
    if missing:
        print('[warn] 缺失文件:', missing)

    oebps = []
    oebps.append(('OEBPS/styles.css', CSS))
    oebps.append(('OEBPS/cover.xhtml', xhtml_doc(BOOK_TITLE,
        '<div style="text-align:center;margin-top:28%;"><h1 style="border:none">' + esc(BOOK_TITLE) + '</h1>'
        '<p style="color:#666">' + esc(BOOK_SUBTITLE) + '</p><hr style="width:40%"/>'
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
        '<head><meta name="dtb:uid" content="urn:uuid:baiju-wujuan-2026"/></head>\n'
        '<docTitle><text>' + esc(BOOK_TITLE) + '</text></docTitle>\n<navMap>\n' +
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
        '<dc:identifier id="uid">urn:uuid:baiju-wujuan-2026</dc:identifier>\n'
        '<dc:title>' + esc(BOOK_TITLE) + '</dc:title>\n'
        '<dc:creator>' + esc(BOOK_CREATOR) + '</dc:creator>\n'
        '<dc:language>' + BOOK_LANG + '</dc:language>\n'
        '<meta property="dcterms:modified">2026-08-31T00:00:00Z</meta>\n'
        '</metadata>\n'
        '<manifest>\n' + manifest_xml + '\n</manifest>\n'
        '<spine toc="ncx">\n' + spine_xml + '\n</spine>\n</package>')
    oebps.append(('OEBPS/content.opf', opf))

    container = ('<?xml version="1.0" encoding="utf-8"?>\n'
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n</container>')

    if dry:
        print('[dry] 章节数:', len(chapters), '| 输出:', out_path)
        for t, _ in nav_items[:12]: print('  -', t)
        return

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with zipfile.ZipFile(out_path, 'w') as z:
        z.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        z.writestr('META-INF/container.xml', container, compress_type=zipfile.ZIP_DEFLATED)
        for name, data in oebps:
            z.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)

    size = os.path.getsize(out_path)
    sha = hashlib.sha256(open(out_path, 'rb').read()).hexdigest()[:12]
    print('✅ EPUB 生成:', out_path)
    print('   章节数:', len(chapters), '| 大小:', round(size / 1024, 1), 'KB | sha256:', sha)

if __name__ == '__main__':
    dry = '--dry' in sys.argv
    out = DEFAULT_OUT
    if '--out' in sys.argv:
        out = sys.argv[sys.argv.index('--out') + 1]
    build(out, dry)
