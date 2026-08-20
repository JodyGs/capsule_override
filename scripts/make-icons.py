#!/usr/bin/env python3
"""Genere les icones de l'app a partir d'une grille 16x16 en pixel art."""
from PIL import Image, ImageDraw

BG_TOP   = (26, 20, 40)
BG_BOT   = (13, 10, 22)
CYAN     = (43, 227, 232)
CYAN_DIM = (17, 138, 143)
GRID     = 16

def check_cells():
    """Coche epaisse tracee sur la grille, blocs de 2x2."""
    cells = set()
    def stroke(x0, y0, x1, y1):
        steps = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(steps + 1):
            x = x0 + (x1 - x0) * i // steps
            y = y0 + (y1 - y0) * i // steps
            for dx in (0, 1):
                for dy in (0, 1):
                    cells.add((x + dx, y + dy))
    stroke(3, 7, 6, 10)    # branche courte
    stroke(6, 10, 13, 3)   # branche longue

    # recentrage : la coche doit tomber au milieu du cadre, pas en bas
    xs = [c[0] for c in cells]
    ys = [c[1] for c in cells]
    dx = round((GRID - 1 - max(xs) - min(xs)) / 2)
    dy = round((GRID - 1 - max(ys) - min(ys)) / 2)
    return {(x + dx, y + dy) for (x, y) in cells}

CELLS = check_cells()

def render(size, inset=0.0, square=True):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # fond : degrade vertical
    for y in range(size):
        t = y / max(size - 1, 1)
        d.line([(0, y), (size, y)], fill=tuple(
            round(BG_TOP[c] + (BG_BOT[c] - BG_TOP[c]) * t) for c in range(3)
        ) + (255,))

    # la coche, ramenee dans la zone sure si demande
    scale = 1.0 - inset
    cell = size * scale / GRID
    origin = size * inset / 2
    for (cx, cy) in CELLS:
        x0 = origin + cx * cell
        y0 = origin + cy * cell
        d.rectangle([x0, y0, x0 + cell, y0 + cell], fill=CYAN + (255,))

    # ombre portee d'un pixel, pour du relief a petite taille
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    off = max(cell * 0.16, 1)
    for (cx, cy) in CELLS:
        x0 = origin + cx * cell + off
        y0 = origin + cy * cell + off
        ds.rectangle([x0, y0, x0 + cell, y0 + cell], fill=CYAN_DIM + (110,))
    base = Image.alpha_composite(img, shadow)

    top = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dt = ImageDraw.Draw(top)
    for (cx, cy) in CELLS:
        x0 = origin + cx * cell
        y0 = origin + cy * cell
        dt.rectangle([x0, y0, x0 + cell, y0 + cell], fill=CYAN + (255,))
    out = Image.alpha_composite(base, top)

    if not square:  # coins arrondis pour le favicon
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=255)
        out.putalpha(mask)
    return out

targets = [
    ("public/icons/icon-192.png",           192, 0.10, True),
    ("public/icons/icon-512.png",           512, 0.10, True),
    ("public/icons/icon-maskable-192.png",  192, 0.34, True),
    ("public/icons/icon-maskable-512.png",  512, 0.34, True),
    ("public/icons/apple-touch-icon.png",   180, 0.12, True),
    ("public/icons/favicon-32.png",          32, 0.06, False),
    ("public/icons/favicon-180.png",        180, 0.06, False),
]

for path, size, inset, square in targets:
    img = render(size, inset, square)
    if path.endswith("apple-touch-icon.png"):
        flat = Image.new("RGB", (size, size), BG_BOT)   # iOS refuse la transparence
        flat.paste(img, mask=img.split()[3])
        flat.save(path)
    else:
        img.save(path)
    print(f"  {path}  {size}x{size}")
