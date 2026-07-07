#!/usr/bin/env python3
"""Generate flat-style 1024x1024 product illustrations in the Greenish palette.
Self-generated assets (no external sources) — logged in asset.md.
Usage: python3 gen-images.py <outdir>
"""
import math
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/prodimg"
S = 1024
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# palette (design/tokens.css)
INK = (31, 31, 29)
PAPER = (251, 250, 249)
SAGE = (102, 117, 90)
SAGE_L = (226, 229, 221)
AMBER = (240, 176, 73)
CORAL = (240, 124, 108)
BLUE = (78, 134, 238)
BLUE_L = (217, 231, 248)
PINK_L = (250, 219, 215)
AMBER_L = (250, 232, 184)

# code -> (name, shape, main color, bg color)
PRODUCTS = {
    "NWTB-1":    ("Chai", "bottle", SAGE, SAGE_L),
    "NWTB-2":    ("Chang", "bottle", BLUE, BLUE_L),
    "NWTCO-3":   ("Aniseed Syrup", "jar", AMBER, AMBER_L),
    "NWTCO-4":   ("Cajun Seasoning", "jar", CORAL, PINK_L),
    "NWTO-5":    ("Olive Oil", "bottle", SAGE, AMBER_L),
    "NWTJP-6":   ("Boysenberry Spread", "jar", (148, 49, 124), PINK_L),
    "NWTDFN-7":  ("Dried Pears", "sack", SAGE, SAGE_L),
    "NWTS-8":    ("Curry Sauce", "jar", AMBER, AMBER_L),
    "NWTDFN-14": ("Walnuts", "sack", (122, 91, 0), AMBER_L),
    "NWTCFV-17": ("Fruit Cocktail", "can", CORAL, PINK_L),
    "NWTBGM-19": ("Chocolate Biscuits Mix", "box", (91, 63, 40), AMBER_L),
    "NWTJP-6b":  ("Marmalade", "jar", AMBER, AMBER_L),
    "NWTBGM-21": ("Scones", "box", AMBER, SAGE_L),
    "NWTB-34":   ("Sasquatch Ale", "bottle", SAGE, SAGE_L),
    "NWTB-43":   ("Coffee", "sack", (91, 63, 40), SAGE_L),
    "NWTCA-48":  ("Chocolate", "box", (91, 63, 40), PINK_L),
    "NWTDFN-51": ("Dried Apples", "sack", CORAL, SAGE_L),
    "NWTG-52":   ("Long Grain Rice", "sack", SAGE, BLUE_L),
    "NWTP-56":   ("Gnocchi", "box", BLUE, BLUE_L),
    "NWTP-57":   ("Ravioli", "box", CORAL, BLUE_L),
}


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def rr(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)


def draw_bottle(d, c):
    cx = S // 2
    rr(d, (cx - 40, 190, cx + 40, 300), 18, shade(c, 0.75))          # neck
    rr(d, (cx - 55, 165, cx + 55, 205), 16, INK)                      # cap
    rr(d, (cx - 150, 280, cx + 150, 830), 70, c)                      # body
    d.ellipse((cx - 118, 320, cx - 70, 500), fill=shade(c, 1.18))     # highlight
    rr(d, (cx - 110, 430, cx + 110, 690), 28, PAPER)                  # label


def draw_jar(d, c):
    cx = S // 2
    rr(d, (cx - 135, 210, cx + 135, 300), 26, INK)                    # lid
    rr(d, (cx - 165, 285, cx + 165, 820), 60, c)                      # body
    d.ellipse((cx - 140, 330, cx - 90, 520), fill=shade(c, 1.18))
    rr(d, (cx - 120, 420, cx + 120, 680), 26, PAPER)                  # label


def draw_box(d, c):
    cx = S // 2
    rr(d, (cx - 190, 260, cx + 190, 820), 34, c)                      # box
    rr(d, (cx - 190, 260, cx + 190, 360), 34, shade(c, 0.8))          # flap band
    rr(d, (cx - 130, 430, cx + 130, 700), 24, PAPER)                  # label
    d.polygon([(cx - 190, 330), (cx, 260), (cx + 190, 330)], fill=shade(c, 0.9))


def draw_sack(d, c):
    cx = S // 2
    d.polygon([(cx - 60, 230), (cx + 60, 230), (cx + 40, 300), (cx - 40, 300)], fill=shade(c, 0.8))
    rr(d, (cx - 80, 205, cx + 80, 250), 18, INK)                      # tie
    d.rounded_rectangle((cx - 185, 290, cx + 185, 830), radius=120, fill=c)
    d.ellipse((cx - 160, 360, cx - 100, 560), fill=shade(c, 1.15))
    rr(d, (cx - 120, 470, cx + 120, 700), 26, PAPER)                  # label


def draw_can(d, c):
    cx = S // 2
    d.ellipse((cx - 160, 230, cx + 160, 330), fill=shade(c, 0.75))
    d.rectangle((cx - 160, 280, cx + 160, 770), fill=c)
    d.ellipse((cx - 160, 720, cx + 160, 820), fill=shade(c, 0.85))
    rr(d, (cx - 160, 420, cx + 160, 640), 8, PAPER)                   # wrap label
    d.ellipse((cx - 150, 236, cx + 150, 324), outline=INK, width=6)


SHAPES = {"bottle": draw_bottle, "jar": draw_jar, "box": draw_box, "sack": draw_sack, "can": draw_can}


def wrap(text, font, maxw, d):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


import os
os.makedirs(OUT, exist_ok=True)
f_name = ImageFont.truetype(FONT_B, 54)
f_code = ImageFont.truetype(FONT_R, 34)
f_brand = ImageFont.truetype(FONT_B, 30)

for code, (name, shape, color, bg) in PRODUCTS.items():
    img = Image.new("RGB", (S, S), bg)
    d = ImageDraw.Draw(img)
    # soft backdrop circle
    d.ellipse((92, 92, S - 92, S - 92), fill=shade(bg, 1.04))
    SHAPES[shape](d, color)
    # label text inside the white label area (center around y=560)
    lines = wrap(name, f_name, 300, d)
    y = 560 - (len(lines) * 60) // 2 + 8
    for ln in lines:
        w = d.textlength(ln, font=f_name)
        d.text((S / 2 - w / 2, y), ln, font=f_name, fill=INK)
        y += 60
    # footer: brand + code
    w = d.textlength("NORTHWIND TRADERS", font=f_brand)
    d.text((S / 2 - w / 2, 880), "NORTHWIND TRADERS", font=f_brand, fill=shade(INK, 2.2))
    w = d.textlength(code, font=f_code)
    d.text((S / 2 - w / 2, 925), code, font=f_code, fill=shade(INK, 3.0))
    img.save(f"{OUT}/{code}.png", optimize=True)
    print(code)
print("done ->", OUT)
