"""Efeitos extras: batida de martelo (thud) e moeda (coin)."""
import sys
import numpy as np, soundfile as sf
SR = 44100
out = sys.argv[1]
t = np.arange(int(0.45 * SR)) / SR
thud = np.sin(2 * np.pi * (60 + 120 * np.exp(-t * 25)) * t) * np.exp(-t * 8)
noise = np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 60) * 0.4
sf.write(f"{out}/thud.wav", np.tanh(2 * (thud + noise)) * 0.6, SR)
t = np.arange(int(0.5 * SR)) / SR
a = np.sin(2 * np.pi * 1318 * t) * np.exp(-t * 10)
b = np.sin(2 * np.pi * 1976 * t) * np.exp(-np.maximum(t - 0.07, 0) * 9) * (t > 0.07)
sf.write(f"{out}/coin.wav", (a + b) * 0.3, SR)
t = np.arange(int(0.7 * SR)) / SR
rise = np.sin(2 * np.pi * (500 * t + 900 * t * t)) * np.minimum(1, t / 0.05) * np.exp(-t * 3)
sf.write(f"{out}/up.wav", rise * 0.25, SR)
print("ok")
