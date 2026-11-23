"""Recria em outra cor a logo gravada num vídeo, para cobri-la exatamente.

A logo gravada tem proporções diferentes da logo original, então a original
(PNG em alta) é cortada em faixas horizontais (escudo, nome, "soluções") e
cada faixa é encaixada na faixa correspondente da logo gravada. A logo gravada
é achada pelos pixels que ficam brancos em todos os quadros (ela é fixa; o
fundo muda). Um contorno fino cobre a borda suavizada da logo branca.
Uso: logo_do_video.py <logo.png> <saida.png> <cor_hex> <quadro1.png> [...]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out, color, *frames = sys.argv[1:]


def bands(mask):
    """Faixas de linhas com pixels, separadas por linhas vazias."""
    rows = mask.any(axis=1)
    out, start = [], None
    for y, r in enumerate(list(rows) + [False]):
        if r and start is None:
            start = y
        elif not r and start is not None:
            out.append((start, y))
            start = None
    return out


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


burned = np.logical_and.reduce(
    [np.asarray(Image.open(p).convert("RGB")).astype(int).min(axis=2) > 205 for p in frames]
)
logo = Image.open(src)
alpha = np.asarray(logo)[..., 3]
lb = bands(alpha > 40)
bb = [b for b in bands(burned) if b[1] - b[0] > 3]
assert len(lb) == len(bb), f"faixas diferentes: logo {lb}, vídeo {bb}"

canvas = Image.new("L", (burned.shape[1], burned.shape[0]), 0)
for (l0, l1), (b0, b1) in zip(lb, bb):
    lm = np.zeros_like(alpha, bool)
    lm[l0:l1] = alpha[l0:l1] > 40
    x0, y0, x1, y1 = bbox(lm)
    bm = np.zeros_like(burned)
    bm[b0:b1] = burned[b0:b1]
    X0, Y0, X1, Y1 = bbox(bm)
    # ajuste fino: tamanho e posição (±3 px) que melhor cobrem a faixa gravada
    best = None
    for dw in range(-3, 4):
        for dh in range(-3, 4):
            w, h = X1 - X0 + dw, Y1 - Y0 + dh
            part = np.asarray(Image.fromarray(alpha[y0:y1, x0:x1]).resize((w, h), Image.LANCZOS)) > 128
            for dx in range(-3, 4):
                for dy in range(-3, 4):
                    win = bm[Y0 + dy:Y0 + dy + h, X0 + dx:X0 + dx + w]
                    if win.shape != part.shape:
                        continue
                    score = (win & part).sum() / (win | part).sum()
                    if best is None or score > best[0]:
                        best = (score, w, h, X0 + dx, Y0 + dy)
    _, w, h, x, y = best
    part = Image.fromarray(alpha[y0:y1, x0:x1]).resize((w, h), Image.LANCZOS)
    canvas.paste(part, (x, y), part)

a = canvas.filter(ImageFilter.MaxFilter(3))
r, g, b = (int(color[i:i + 2], 16) for i in (1, 3, 5))
rgba = np.zeros(burned.shape + (4,), np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2] = r, g, b
rgba[..., 3] = np.asarray(a)
Image.fromarray(rgba).save(out)
cover = (np.asarray(a) > 128)[burned].mean()
print(f"{len(bb)} faixas; cobre {cover:.1%} dos pixels da logo branca")
