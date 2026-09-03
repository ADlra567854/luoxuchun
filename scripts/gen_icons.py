# 生成 PWA 图标（icon-192.png / icon-512.png）
from PIL import Image, ImageDraw, ImageFont
import os

def make_icon(size, path):
    img = Image.new('RGBA', (size, size), (4, 6, 12, 255))
    d = ImageDraw.Draw(img)
    # 渐变对角背景
    for y in range(size):
        t = y / size
        r = int(94 + (139 - 94) * t)
        g = int(234 + (92 - 234) * t)
        b = int(212 + (246 - 212) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 36))
    # 圆角遮罩
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size, size], radius=int(size*0.19), fill=255)
    # 金色圆环装饰
    r = int(size*0.14)
    cx, cy = int(size*0.78), int(size*0.22)
    d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(240,185,92,255), width=int(size*0.02))
    d.arc([cx-r, cy-r, cx+r, cy+r], 45, 300, fill=(4,6,12,255), width=int(size*0.022))
    # 中央字符「纪」
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc', int(size*0.46))
    except Exception:
        font = ImageFont.load_default()
    txt = '纪'
    bbox = d.textbbox((0,0), txt, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    d.text(((size-tw)/2 - bbox[0], (size-th)/2 - bbox[1]), txt, font=font, fill=(240,249,255,255))
    img.putalpha(mask)
    img.save(path, 'PNG')
    print('生成', path, size, 'x', size)

base = r'D:\新建文件夹\AI创作纪元'
make_icon(192, os.path.join(base, 'icon-192.png'))
make_icon(512, os.path.join(base, 'icon-512.png'))
