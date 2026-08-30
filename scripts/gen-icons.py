# -*- coding: utf-8 -*-
"""Generate PWA icons from a simple bar-chart glyph using Pillow."""
from PIL import Image, ImageDraw

BG = (16, 24, 40, 255)          # #101828
BAR = (79, 70, 229, 255)        # indigo
BAR_ACCENT = (99, 102, 241, 255)
WHITE = (255, 255, 255, 255)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)

    margin = size * 0.22
    area = size - 2 * margin
    bars = 3
    gap = area * 0.14
    bar_w = (area - gap * (bars - 1)) / bars
    heights = (0.52, 0.78, 1.0)
    base_y = size - margin

    for i, h in enumerate(heights):
        x0 = margin + i * (bar_w + gap)
        bar_h = area * h
        y0 = base_y - bar_h
        color = BAR_ACCENT if i % 2 else BAR
        d.rounded_rectangle([x0, y0, x0 + bar_w, base_y], radius=size * 0.03, fill=color)

    return img


def maskable(size: int) -> Image.Image:
    # Safe zone: glyph scaled to 60% centered
    img = Image.new("RGBA", (size, size), BG)
    inner = draw_icon(int(size * 0.6))
    ox = (size - inner.width) // 2
    oy = (size - inner.height) // 2
    img.alpha_composite(inner, (ox, oy))
    return img


def main() -> None:
    draw_icon(192).save("public/icons/icon-192.png")
    draw_icon(512).save("public/icons/icon-512.png")
    maskable(512).save("public/icons/icon-maskable-512.png")
    draw_icon(180).save("public/icons/apple-touch-icon.png")
    print("icons generated")


if __name__ == "__main__":
    main()