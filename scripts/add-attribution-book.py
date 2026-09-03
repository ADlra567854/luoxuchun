# -*- coding: utf-8 -*-
"""给缺出处标注的书稿/章节页批量补「出处声明」区块"""
import glob, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BLOCK = '''
<!-- ====== 出处声明 ====== -->
<div class="blog-attribution" style="margin-top:26px;padding:14px 16px;border:1px dashed rgba(217,119,6,.35);border-radius:12px;background:rgba(250,204,21,.06)">
  <b style="font-size:13px;color:#d97706">📜 出处声明</b>
  <p style="font-size:12.5px;color:var(--muted);margin:8px 0 0;line-height:1.7">
    本文由本站 AI 创作整理，内容基于公开知识/官方资料提炼，<b>信息请以官方发布为准</b>；
    涉及的历史事件、产品与数据均可在公开渠道查证，本站不编造来源。引用外部内容遵循其原始许可，标注出处即可。
  </p>
</div>
'''

HONEST = ['AI 生成 · 以官方为准', 'AI 生成', '以官方为准', '出处声明', '项目出处与许可', '项目出处', '出处', '来源']

targets = []
targets += glob.glob('website/ai-academy/chapter-*.html')
targets += glob.glob('website/book/pages/*.html')
targets += glob.glob('book/五卷全书/*.html')

count = 0
for fp in targets:
    html = open(fp, encoding='utf-8').read()
    # 已有任何出处/诚实标记就跳过
    if any(m in html for m in HONEST):
        continue
    # 插到 </article> 前，或 body 结束前
    if '</article>' in html:
        html = html.replace('</article>', BLOCK + '\n</article>', 1)
    elif '</body>' in html:
        html = html.replace('</body>', BLOCK + '\n</body>', 1)
    else:
        html += BLOCK
    open(fp, 'w', encoding='utf-8').write(html)
    count += 1
    print('✅ 补出处:', fp)

print(f'\n共补 {count} 页')
