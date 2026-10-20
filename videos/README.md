# Vídeos

Anúncios em vídeo feitos com [Remotion](https://www.remotion.dev) (React → MP4).
É um projeto separado do app Next.js, com dependências próprias.

| Composição | Arquivo | Formato |
|---|---|---|
| `AllureAd` | `src/AllureAd.tsx` | 9:16, 16 s, Allure Clinic (Dra. Jéssica) |
| `NfcAd` | `src/NfcAd.tsx` | 9:16, 22 s, placa NFC genérica, com narração e trilha |

Licença do Remotion: grátis para pessoa física e empresas com até 3 funcionários.

## Renderizar

```bash
cd videos
npm install
npm run typecheck
npm run render -- NfcAd out/placa-nfc.mp4
```

O script `render` usa o Chromium já instalado no ambiente cloud
(`/opt/pw-browsers`). Para normalizar o volume no padrão de redes sociais:

```bash
ffmpeg -i out/placa-nfc.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k out/placa-nfc-final.mp4
```

## Áudio

Arquivos em `public/nfc-audio/`: `voz1.wav`…`voz5.wav` (uma fala por cena),
`musica.wav`, `whoosh.wav`, `bip.wav` e `pop.wav`. O texto das falas fica em
`narracao/placa-nfc.txt`. Se mudar a duração das falas, ajuste as durações
das cenas (`S1`…`S5`) em `src/NfcAd.tsx`.

### Narração com Google Cloud Text-to-Speech (vozes naturais)

Precisa da variável `GOOGLE_TTS_API_KEY` no ambiente (projeto do Google Cloud
com a Cloud Text-to-Speech API ativada).

```bash
node scripts/google-tts.mjs check
node scripts/google-tts.mjs vozes Chirp3
node scripts/google-tts.mjs narrar <voz> narracao/placa-nfc.txt public/nfc-audio --velocidade 1.05
```

### Narração com Kokoro (grátis, offline, soa mais robótica)

O modelo é baixado do GitHub, porque o Hugging Face é bloqueado no ambiente.
Vozes pt-BR: `pf_dora` (feminina), `pm_alex` e `pm_santa` (masculinas).

```bash
python3 -m venv .tts/venv && .tts/venv/bin/pip install kokoro-onnx soundfile numpy
mkdir -p .tts/models && for f in kokoro-v1.0.int8.onnx voices-v1.0.bin; do
  curl -sSL -o .tts/models/$f https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f
done
.tts/venv/bin/python -I scripts/kokoro.py .tts/models pf_dora 1.05 public/nfc-audio/voz1.wav "Texto da fala"
```

### Trilha e efeitos

`scripts/musica.py` sintetiza a trilha e os efeitos do zero (sem direitos autorais):

```bash
.tts/venv/bin/python -I scripts/musica.py public/nfc-audio <duracao_s> <inicio_bateria_s>
```
