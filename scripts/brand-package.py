"""品牌资产 后处理打包
1. 商标申请图样 -> JPG（商标局要求：JPG、400x400~1500x1500、<200KB）
2. favicon.ico（16/32/48 多尺寸合一）
3. 输出清单报告

运行： <venv>/Scripts/python.exe scripts/brand-package.py
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TM = os.path.join(ROOT, "assets", "brand", "trademark")
EXP = os.path.join(ROOT, "assets", "brand", "export")
MAX_KB = 200  # 商标局图样大小上限


def to_jpg(src, dst, quality=92, target_kb=MAX_KB):
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        im = im.convert("RGBA")
        bg.paste(im, mask=im.split()[3])
        im = bg
    else:
        im = im.convert("RGB")
    q = quality
    while True:
        im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
        kb = os.path.getsize(dst) / 1024
        if kb <= target_kb or q <= 55:
            break
        q -= 5
    return os.path.getsize(dst) / 1024, im.size, q


def build_ico(dst, sizes=(16, 32, 48)):
    imgs = []
    for s in sizes:
        p = os.path.join(EXP, f"favicon-{s}.png")
        im = Image.open(p).convert("RGBA")
        imgs.append(im.resize((s, s), Image.LANCZOS))
    imgs[0].save(dst, format="ICO", sizes=[(i.width, i.height) for i in imgs],
                 append_images=imgs[1:])
    return os.path.getsize(dst) / 1024


def main():
    print("=" * 64)
    print("商标申请图样（JPG）")
    print("=" * 64)
    rows = []
    for name, label in [
        ("tm-black-1000.png", "图形商标 · 黑白稿（主推提交）"),
        ("tm-color-1000.png", "图形商标 · 彩色稿（指定颜色时用）"),
        ("tm-word-1000.png", "文字商标「白驹」"),
    ]:
        src = os.path.join(TM, name)
        dst = os.path.join(TM, name.replace(".png", ".jpg"))
        if not os.path.exists(src):
            print(f"  [skip] {src} 不存在")
            continue
        kb, size, q = to_jpg(src, dst)
        ok = "OK " if kb <= MAX_KB else "超限"
        rows.append((label, f"{size[0]}x{size[1]}", f"{kb:.1f}KB", f"q{q}", ok))
        print(f"  {ok}  {label:<28} {size[0]}x{size[1]}  {kb:6.1f}KB  (q={q})")

    print()
    print("=" * 64)
    print("favicon.ico")
    print("=" * 64)
    ico = os.path.join(EXP, "favicon.ico")
    kb = build_ico(ico)
    print(f"  OK   favicon.ico (16/32/48)  {kb:.1f}KB")

    print()
    print("=" * 64)
    print("清单")
    print("=" * 64)
    for label, size, kb, q, ok in rows:
        print(f"  [{ok}] {label:<28} {size:<10} {kb:<10}")


if __name__ == "__main__":
    main()
