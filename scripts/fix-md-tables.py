#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fix-md-tables.py — 修复 gen-viral 旧版渲染器把 GFM 管道表格当普通段落输出的 bug
（2026-09-03 发现：blog/*.html 中 <p>| 模型类型 | ... |</p> 原样残留，读者直接看到 Markdown 符号）

幂等：转换后不再存在 <p> 开头的管道行；已转成 <table> 的页面自动跳过。
用法：python fix-md-tables.py [--dry]
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__)) + '/..'
BLOG = os.path.join(ROOT, 'blog')

# 单元格基础样式与 gen-viral.mjs 渲染器一致（双主题 token）
TH = 'padding:9px 12px;border-bottom:1px solid var(--line);background:rgba(255,140,90,.13);color:var(--gold);text-align:left;font-weight:700'
TD = 'padding:9px 12px;border-bottom:1px solid var(--line);color:var(--text);text-align:left'
TABLE = ('<table style="width:100%;border-collapse:collapse;margin:12px 0 20px;font-size:14px;line-height:1.6;'
         'border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card)">')

def is_sep(cell_text):
    return bool(re.fullmatch(r':?-{2,}:?', cell_text.strip()))

def parse_row(line):
    # 取 <p>...</p> 内文本，去掉首尾 |，按 | 切分
    m = re.search(r'<p>\s*(.*?)</p>', line, re.S)
    if not m:
        return None
    s = m.group(1).strip()
    if not s.startswith('|'):
        return None
    s = s[1:]            # 去行首 |
    if s.endswith('|'):
        s = s[:-1]       # 去行尾 |（旧版漏剥会多出幽灵空列）
    # 去 HTML 实体反转义仅限常见项
    s = s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    return [c.strip() for c in s.split('|')]

def block_to_table(block):
    rows = []
    for line in block.splitlines():
        r = parse_row(line)
        if r is None:
            return None
        rows.append(r)
    if len(rows) < 2:
        return None
    # 去掉分隔行（第 2 行全为 ----）
    if is_sep(rows[1][0]) and all(is_sep(c) for c in rows[1]):
        rows.pop(1)
    if not rows:
        return None
    cols = max(len(r) for r in rows)
    head = rows[0]
    ths = ''.join('<th style="%s">%s</th>' % (TH, head[ci] if ci < len(head) else '') for ci in range(cols))
    trs = []
    for r in rows[1:]:
        tds = []
        for ci in range(cols):
            txt = r[ci] if ci < len(r) else ''
            style = TD + ';font-weight:700;color:var(--cyan)' if ci == 0 else TD
            tds.append('<td style="%s">%s</td>' % (style, txt))
        trs.append('<tr>%s</tr>' % ''.join(tds))
    return TABLE + '<thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (ths, ''.join(trs))

def fix_file(fp, dry):
    html = open(fp, encoding='utf-8', errors='ignore').read()
    # 连续 <p>| 管道行块（行间仅空白）
    pat = re.compile(r'(?:<p>\s*\|[^<]*(?:\|[^<]*)*</p>\s*\n?)+')
    hits = list(pat.finditer(html))
    if not hits:
        return 0
    fixed = 0
    out = []
    last = 0
    for m in hits:
        block = m.group(0)
        table = block_to_table(block)
        if table is None:
            out.append(html[last:m.end()]); last = m.end(); continue
        out.append(html[last:m.start()]); out.append(table); last = m.end()
        fixed += 1
    out.append(html[last:])
    if fixed:
        new = ''.join(out)
        if not dry:
            open(fp, 'w', encoding='utf-8').write(new)
        tag = '[dry] ' if dry else ''
        print('%s%s：转换 %d 个表格' % (tag, os.path.basename(fp), fixed))
    return fixed

def main():
    dry = '--dry' in sys.argv
    total = 0
    for fp in sorted(glob.glob(os.path.join(BLOG, '*.html'))):
        total += fix_file(fp, dry)
    print(('（dry 模式，未写盘）' if dry else '') + '共转换表格 %d 个' % total)

if __name__ == '__main__':
    main()
