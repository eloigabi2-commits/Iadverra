"""Trilha eletrônica leve e efeitos sonoros, sintetizados do zero (sem direitos autorais).

Uso: music.py <pasta_saida> <duracao_s> <inicio_bateria_s>
"""
import sys

import numpy as np
import soundfile as sf

SR = 44100
out_dir, total, drums_in = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
rng = np.random.default_rng(7)

BPM = 112
BEAT = 60 / BPM
BAR = 4 * BEAT


def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def add(buf, x, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(x), len(buf) - i)
    buf[i : i + n] += x[:n]


def saw(f, t):
    return 2 * ((f * t) % 1) - 1


# Am  F  C  G  (fundamentais em MIDI)
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]

n = int(total * SR)
pad = np.zeros(n)
pluck = np.zeros(n)
bass = np.zeros(n)
drums = np.zeros(n)

bars = int(np.ceil(total / BAR))
for b in range(bars):
    chord = CHORDS[b % 4]
    start = b * BAR
    # pad: serras desafinadas, ataque lento
    t = t_arr(BAR)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (BAR - t) / 0.3)
    x = sum(saw(midi(m) * d, t) for m in chord for d in (0.997, 1.003))
    add(pad, x * env * 0.05, start)
    # arpejo em colcheias
    notes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
    for k in range(8):
        tt = t_arr(0.5)
        f = midi(notes[k % 4])
        tone = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)
        add(pluck, tone * np.exp(-tt * 9) * 0.11, start + k * BEAT / 2)
    # baixo pulsando em colcheias
    for k in range(8):
        tt = t_arr(BEAT / 2)
        f = midi(chord[0] - 12)
        tone = np.tanh(2 * np.sin(2 * np.pi * f * tt))
        env = np.minimum(1, tt / 0.01) * np.exp(-tt * 5)
        add(bass, tone * env * 0.16, start + k * BEAT / 2)
    # bateria depois da entrada
    if start + BAR > drums_in:
        for k in range(4):
            at = start + k * BEAT
            if at < drums_in:
                continue
            tt = t_arr(0.35)
            kick = np.sin(2 * np.pi * (45 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9)
            if k in (0, 2):
                add(drums, kick * 0.5, at)
            else:
                noise = rng.standard_normal(len(tt))
                add(drums, noise * np.exp(-tt * 22) * 0.12, at)
            for h in (0, 0.5):
                th = t_arr(0.06)
                hat = np.diff(rng.standard_normal(len(th) + 1))
                add(drums, hat * np.exp(-th * 70) * 0.05, at + h * BEAT)

pad = lowpass(pad, 1400)
mix = pad + pluck + bass + drums
fade = np.ones(n)
fl = int(1.5 * SR)
fade[-fl:] = np.linspace(1, 0, fl)
fade[: int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
mix *= fade
mix /= np.max(np.abs(mix)) / 0.8
sf.write(f"{out_dir}/musica.wav", np.stack([mix, mix], 1), SR)

# efeitos
t = t_arr(0.55)
noise = rng.standard_normal(len(t))
sweep = np.zeros_like(noise)
for lo, hi in ((300, 3000),):
    cut = lo + (hi - lo) * np.sin(np.pi * t / t[-1])
    acc = 0.0
    for i, v in enumerate(noise):
        a = np.exp(-2 * np.pi * cut[i] / SR)
        acc = (1 - a) * v + a * acc
        sweep[i] = acc
whoosh = sweep * np.sin(np.pi * t / t[-1]) ** 2
sf.write(f"{out_dir}/whoosh.wav", whoosh / np.max(np.abs(whoosh)) * 0.5, SR)

t = t_arr(0.22)
bip = np.concatenate([
    np.sin(2 * np.pi * 1760 * t_arr(0.09)),
    np.zeros(int(0.03 * SR)),
    np.sin(2 * np.pi * 2350 * t_arr(0.12)),
])
env = np.minimum(1, np.arange(len(bip)) / 200)
sf.write(f"{out_dir}/bip.wav", bip * env * 0.35, SR)

t = t_arr(0.25)
pop = np.sin(2 * np.pi * (700 + 500 * np.exp(-t * 40)) * t) * np.exp(-t * 18)
sf.write(f"{out_dir}/pop.wav", pop * 0.4, SR)
print("ok", f"{total:.1f}s")
