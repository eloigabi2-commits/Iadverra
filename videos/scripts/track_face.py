"""Rastreia o rosto a 10 quadros/s e grava JSON com centro e tamanho suavizados (em px do vídeo)."""
import json, sys
import cv2
import numpy as np
src, out = sys.argv[1:3]
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
step = max(1, round(fps / 10))
pts, i, last = [], 0, None
while True:
    ok, fr = cap.read()
    if not ok: break
    if i % step == 0:
        g = cv2.cvtColor(cv2.resize(fr, (540, 960)), cv2.COLOR_BGR2GRAY)
        faces = casc.detectMultiScale(g, 1.1, 5, minSize=(80, 80))
        # descarta falsos positivos (mãos, objetos): o rosto fica na metade de cima
        faces = [f for f in faces if f[1] + f[3] / 2 < 400 and f[2] < 260]
        if len(faces):
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            last = [(x + w / 2) * 2, (y + h / 2) * 2, w * 2]
        pts.append([i / fps] + (last or [540, 450, 300]))
    i += 1
a = np.array(pts)
k = 5  # média móvel para tirar tremedeira
for c in (1, 2, 3):
    a[:, c] = np.convolve(np.pad(a[:, c], k // 2, mode="edge"), np.ones(k) / k, mode="valid")
json.dump([[round(v, 2) for v in r] for r in a.tolist()], open(out, "w"))
print(len(a), "pontos; x", a[:,1].min().round(), a[:,1].max().round(), "y", a[:,2].min().round(), a[:,2].max().round(), "w", a[:,3].min().round(), a[:,3].max().round())
