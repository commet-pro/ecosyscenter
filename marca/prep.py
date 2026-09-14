#!/usr/bin/env python3
"""Recorta o fundo chapado dos PNGs oficiais da marca sem tocar no desenho.

Cada pixel é projetado na reta entre a cor de fundo e a cor de paleta mais
próxima. O comprimento da projeção vira o alfa; a cor de paleta vencedora vira
a cor do pixel. Nada é redesenhado, reespaçado nem recolorido — só se remove o
fundo, e a franja de antialiasing sai limpa.
"""
from PIL import Image
import numpy as np, json

NAVY, RED, ROD, CHASSI = (0x12,0x2B,0x4A), (0xC8,0x10,0x2B), (0x2E,0x6D,0xA4), (0xE4,0xE7,0xEB)

def destacar(origem, destino, fundo, tintas):
    px = np.asarray(Image.open(origem).convert("RGB")).astype(np.float32)
    h, w, _ = px.shape
    b = np.array(fundo, np.float32)
    d = px - b                                   # vetor do fundo até o pixel

    melhor_a = np.zeros((h, w), np.float32)
    melhor_r = np.full((h, w), 1e9, np.float32)
    melhor_c = np.zeros((h, w, 3), np.float32)

    for tinta in tintas:
        v = np.array(tinta, np.float32) - b
        t = np.clip((d @ v) / float(v @ v), 0.0, 1.0)          # projeção
        resto = np.linalg.norm(d - t[..., None] * v, axis=-1)  # o que sobrou
        troca = resto < melhor_r
        melhor_r = np.where(troca, resto, melhor_r)
        melhor_a = np.where(troca, t, melhor_a)
        melhor_c = np.where(troca[..., None], np.array(tinta, np.float32), melhor_c)

    alfa = (melhor_a * 255).round().astype(np.uint8)
    rgba = np.dstack([melhor_c.round().astype(np.uint8), alfa])

    ys, xs = np.nonzero(alfa > 8)                 # caixa da tinta
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    corte = rgba[y0:y1, x0:x1]
    Image.fromarray(corte, "RGBA").save(destino)
    return dict(arquivo=destino, w=int(x1 - x0), h=int(y1 - y0),
                ratio=round((x1 - x0) / (y1 - y0), 6))

m = {
  "cor":      destacar("oficial-cor.png",      "simbolo-cor.png",      CHASSI, [NAVY, RED, ROD]),
  "negativo": destacar("oficial-negativa.png", "simbolo-negativo.png", NAVY,   [CHASSI, RED, ROD]),
}
print(json.dumps(m, indent=2))
json.dump(m, open("metrics.json", "w"), indent=2)
