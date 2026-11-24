"""Apaga uma logo branca fixa gravada num vídeo (inpainting quadro a quadro).

A logo é achada pelos pixels que ficam brancos em vários quadros (ela é fixa;
o fundo muda); a máscara é engrossada e preenchida com o fundo ao redor.
Só a região da logo é processada. O áudio é mantido.
Uso: apagar_logo.py <entrada> <saida.mp4> <x0> <y0> <x1> <y1>   (região, px do vídeo)
"""
import subprocess
import sys

import cv2
import numpy as np

src, out = sys.argv[1:3]
x0, y0, x1, y1 = map(int, sys.argv[3:7])

cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
frames = []
while True:
    ok, fr = cap.read()
    if not ok:
        break
    frames.append(fr)
h, w = frames[0].shape[:2]

samples = frames[:: max(1, len(frames) // 14)]
mask = np.logical_and.reduce([f[y0:y1, x0:x1].min(axis=2) > 175 for f in samples]).astype(np.uint8) * 255
mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=3)
print(f"{len(frames)} quadros {w}x{h}; máscara com {int((mask > 0).sum())} px")

tmp = out + ".video.mp4"
enc = subprocess.Popen(
    ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}",
     "-r", str(fps), "-i", "-", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", tmp],
    stdin=subprocess.PIPE,
)
for fr in frames:
    roi = fr[y0:y1, x0:x1]
    fr[y0:y1, x0:x1] = cv2.inpaint(roi, mask, 6, cv2.INPAINT_TELEA)
    enc.stdin.write(fr.tobytes())
enc.stdin.close()
enc.wait()
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-i", src, "-map", "0:v", "-map", "1:a?",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out], check=True)
subprocess.run(["rm", tmp])
print("ok", out)
