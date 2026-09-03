# -*- coding: utf-8 -*-
"""给 24 个毕业设计项目页补「项目出处与许可」区块"""
import glob, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BLOCK = '''
<!-- ====== 项目出处与许可 ====== -->
<div class="proj-attribution" style="margin-top:26px;padding:14px 16px;border:1px dashed rgba(217,119,6,.35);border-radius:12px;background:rgba(250,204,21,.06)">
  <b style="font-size:13px;color:#d97706">📜 项目出处与许可</b>
  <p style="font-size:12.5px;color:var(--muted);margin:8px 0 0;line-height:1.7">
    本项目为本站 AI 学院「毕业设计」板块原创教学项目，由 AI 生成原型并整理，<b>以官方文档与真实开源生态为准</b>。
    技术栈均基于公开、主流的开源库（如 Transformers / LangChain / FastAPI / SQLite 等），可对照各库官方仓库核验。
    如引用第三方开源项目，请遵循其原始许可证（MIT / Apache-2.0 / BSD 等）；本项目内容可按 MIT 协议自由使用，标注出处即可。
  </p>
</div>
'''

count = 0
for fp in sorted(glob.glob('website/ai-academy/projects/*.html')):
    html = open(fp, encoding='utf-8').read()
    if '项目出处与许可' in html:
        continue
    # 插到 </article> 前，或正文最后
    if '</article>' in html:
        html = html.replace('</article>', BLOCK + '\n</article>', 1)
    else:
        html += BLOCK
    open(fp, 'w', encoding='utf-8').write(html)
    count += 1
    print('✅ 补出处:', fp)

print(f'\n共 {count} 个项目页补出处')
