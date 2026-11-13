"""Tira o fundo azul da logo e salva PNG branco com transparência, recortado."""
import sys
import numpy as np
from PIL import Image
src, out = sys.argv[1:3]
a = np.asarray(Image.open(src).convert("RGB")).astype(float)
bg = np.median(a[:20, :20].reshape(-1, 3), axis=0)
alpha = np.clip((a[..., 0] - bg[0]) / (255 - bg[0]), 0, 1)
alpha[alpha < 0.08] = 0
rgba = np.zeros(a.shape[:2] + (4,), np.uint8)
rgba[..., :3] = 255
rgba[..., 3] = (alpha * 255).astype(np.uint8)
ys, xs = np.nonzero(rgba[..., 3])
img = Image.fromarray(rgba).crop((xs.min() - 4, ys.min() - 4, xs.max() + 5, ys.max() + 5))
img.save(out)
print(img.size, "fundo", bg.round())
