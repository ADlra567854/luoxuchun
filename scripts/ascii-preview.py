"""把 PNG 降采样成字符画，用于在无多模态能力时校验图形轮廓。"""
import sys
from PIL import Image

RAMP = " .:-=+*#%@"


def preview(path, cols=64, invert=False):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[3] if im.mode == "RGBA" else None)
    g = bg.convert("L")
    w, h = g.size
    rows = int(cols * h / w * 0.5)
    g = g.resize((cols, rows), Image.LANCZOS)
    px = g.load()
    out = []
    for y in range(rows):
        line = []
        for x in range(cols):
            v = px[x, y]
            if invert:
                v = 255 - v
            line.append(RAMP[min(len(RAMP) - 1, int((255 - v) / 255 * (len(RAMP) - 1)))])
        out.append("".join(line))
    return "\n".join(out)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("=" * 66)
        print(p)
        print("=" * 66)
        print(preview(p, cols=64))
