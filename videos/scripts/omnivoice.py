"""Gera as falas com o OmniVoice (motor do VoiceStudio), em modo de criação de voz.

Uso: omni_tts.py <repo_voicestudio> <pasta_modelo> <falas.txt> <pasta_saida> "<descricao>" [velocidade]
Descrição: tags em inglês, ex. "female, young adult, moderate pitch".
"""
import sys
import time

repo, model_dir, falas, out_dir, instruct = sys.argv[1:6]
speed = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
sys.path.insert(0, repo)

import torch  # noqa: E402
import torchaudio  # noqa: E402
from omnivoice.models.omnivoice import OmniVoice  # noqa: E402

torch.manual_seed(7)
torch.set_num_threads(4)
t0 = time.time()
model = OmniVoice.from_pretrained(model_dir, device_map="cpu", dtype=torch.float32)
print(f"modelo carregado em {time.time() - t0:.0f}s", flush=True)

lines = [l.strip() for l in open(falas, encoding="utf8") if l.strip()]
for i, text in enumerate(lines, 1):
    t0 = time.time()
    # mesma semente em todas as falas para manter a mesma voz
    torch.manual_seed(7)
    audio = model.generate(text=text, language="pt", instruct=instruct, speed=speed)[0]
    path = f"{out_dir}/voz{i}.wav"
    torchaudio.save(path, audio, model.sampling_rate)
    dur = audio.shape[-1] / model.sampling_rate
    print(f"{path}: {dur:.2f}s (gerado em {time.time() - t0:.0f}s)", flush=True)
