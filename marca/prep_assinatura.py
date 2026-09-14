#!/usr/bin/env python3
"""Recorta a ASSINATURA REDUZIDA da página VERSÕES E ASSINATURAS do manual.

Entrada: manual-pagina-versoes.png (a página do Manual de Marca v1.0 rasterizada
a 3840 × 2160). Nada é redesenhado — só se remove o fundo chapado, projetando
cada pixel na reta entre a cor de fundo e a cor de paleta mais próxima. O
comprimento da projeção vira o alfa; a cor vencedora vira a cor do pixel.

Saída: assinatura-reduzida-cor.png e assinatura-reduzida-neg.png (o mesmo
alfa, todo branco — que é a versão negativa do manual).
"""
from PIL import Image
import numpy as np, collections, json

pag = Image.open("manual-pagina-versoes.png").convert("RGB")
W, H = pag.size
reg = pag.crop((int(.340*W), int(.130*H), int(.670*W), int(.420*H)))   # célula do meio, linha de cima
a = np.asarray(reg).astype(np.float32)

FUNDO = np.array(collections.Counter(
    map(tuple, np.asarray(reg).reshape(-1, 3))).most_common(1)[0][0], np.float32)
TINTAS = [np.array(c, np.float32) for c in
          ((0x12,0x2B,0x4A), (0xC8,0x10,0x2E), (0x2E,0x6D,0xA4))]

d = a - FUNDO
melhor_a = np.zeros(a.shape[:2], np.float32)
melhor_r = np.full(a.shape[:2], 1e9, np.float32)
melhor_c = np.zeros(a.shape, np.float32)
for tinta in TINTAS:
    v = tinta - FUNDO
    t = np.clip((d @ v) / float(v @ v), 0.0, 1.0)
    resto = np.linalg.norm(d - t[..., None]*v, axis=-1)
    troca = resto < melhor_r
    melhor_r = np.where(troca, resto, melhor_r)
    melhor_a = np.where(troca, t, melhor_a)
    melhor_c = np.where(troca[..., None], tinta, melhor_c)

alfa = melhor_a.copy()
alfa[alfa < 0.06] = 0.0                       # mata o ruído de JPEG no fundo
ys, xs = np.nonzero(alfa > 0.30)
y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1

A = (alfa[y0:y1, x0:x1]*255).round().astype(np.uint8)
C = melhor_c[y0:y1, x0:x1].round().astype(np.uint8)
Image.fromarray(np.dstack([C, A]), "RGBA").save("assinatura-reduzida-cor.png", optimize=True)
Image.fromarray(np.dstack([np.full(C.shape, 255, np.uint8), A]), "RGBA") \
     .save("assinatura-reduzida-neg.png", optimize=True)
json.dump({"w": int(x1-x0), "h": int(y1-y0), "ratio": round((x1-x0)/(y1-y0), 6)},
          open("assinatura-metrics.json", "w"), indent=2)
print(f"{x1-x0} × {y1-y0} px · proporção {(x1-x0)/(y1-y0):.4f}")
