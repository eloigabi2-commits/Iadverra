"""Converte 'palavra@ini-fim' em blocos de legenda (até 3 palavras, quebra em pontuação ou pausa)."""
import json, re, sys
src, out = sys.argv[1:3]
words = []
for tok in open(src).read().split():
    w, t = tok.rsplit("@", 1)
    a, b = map(float, t.split("-"))
    words.append([w, a, b])
# correções da transcrição
FIX = {"impar": "limpar", "pix?": "Pix?", "soluções,": "Soluções,", "soluções": "Soluções"}
merged = []
for w in words:
    w[0] = FIX.get(w[0], w[0])
    if merged and (w[0] in ("$", "%") or merged[-1][0] == "R$" or (merged[-1][0] == "R" and w[0] == "$")):
        merged[-1][0] = (merged[-1][0] + w[0]).replace("R$", "R$ ") if merged[-1][0] == "R$" else merged[-1][0] + w[0]
        merged[-1][2] = w[2]
    else:
        merged.append(w)
for w in merged:
    w[0] = w[0].replace("R$ ", "R$ ").replace("R$399", "R$ 399")
chunks, cur = [], []
for i, w in enumerate(merged):
    cur.append(w)
    nxt = merged[i + 1] if i + 1 < len(merged) else None
    if len(cur) >= 3 or re.search(r"[.,?!]$", w[0]) or not nxt or nxt[1] - w[2] > 0.35:
        chunks.append({"start": cur[0][1], "end": (nxt[1] if nxt and nxt[1] - w[2] < 0.6 else w[2] + 0.2),
                       "words": [{"t": x[0], "s": x[1]} for x in cur]})
        cur = []
json.dump(chunks, open(out, "w"), ensure_ascii=False)
print(len(chunks), "blocos;", " | ".join(" ".join(x["t"] for x in c["words"]) for c in chunks[18:30]))
