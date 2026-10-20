"""Gera narração em pt-BR com Kokoro (offline).

Uso: say.py <models_dir> <voz> <velocidade> <saida.wav> <texto>
"""
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

models, voice, speed, out, text = sys.argv[1:6]
kokoro = Kokoro(f"{models}/kokoro-v1.0.int8.onnx", f"{models}/voices-v1.0.bin")
if voice == "list":
    print([v for v in kokoro.get_voices() if v.startswith("p")])
    sys.exit()
samples, sr = kokoro.create(text, voice=voice, speed=float(speed), lang="pt-br")
sf.write(out, samples, sr)
print(f"{out}: {len(samples) / sr:.2f}s")
