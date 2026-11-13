"""Converte 'palavra@ini-fim' (scripts/transcrever.py) em blocos de legenda.

Até 3 palavras por bloco; quebra em pontuação ou pausa. Junta números que o
Whisper separa ("R" "$" "399" ",00." → "R$ 399,00."; "8" ".078," → "8.078,").
Uso: captions.py <palavras.txt> <saida.json>
"""
import json, re, sys
src, out = sys.argv[1:3]
FIX = {"impar": "limpar", "pix?": "Pix?", "soluções,": "Soluções,", "soluções": "Soluções", "soluções.": "Soluções."}
words = []
for tok in open(src).read().split():
    w, t = tok.rsplit("@", 1)
    a, b = map(float, t.split("-"))
    w = FIX.get(w, w)
    prev = words[-1][0] if words else ""
    if words and (w in ("$", "%") or re.match(r"^[,.]\d", w) or prev == "R$"):
        words[-1][0] = prev + (" " if prev == "R$" else "") + w
        words[-1][2] = b
    else:
        words.append([w, a, b])
chunks, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    if len(cur) >= 3 or re.search(r"[.,?!]$", w[0]) or not nxt or nxt[1] - w[2] > 0.35:
        end = nxt[1] if nxt and nxt[1] - w[2] < 0.6 else w[2] + 0.2
        chunks.append({"start": cur[0][1], "end": end, "words": [{"t": x[0], "s": x[1]} for x in cur]})
        cur = []
json.dump(chunks, open(out, "w"), ensure_ascii=False)
print(len(chunks), "blocos")
print(" | ".join(" ".join(x["t"] for x in c["words"]) for c in chunks))
