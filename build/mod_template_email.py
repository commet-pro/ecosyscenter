#!/usr/bin/env python3
"""Módulo Template de e-mail — editor de campanhas promocionais.

O HTML original já é autocontido (CSS, JS e assets base64 embutidos).
Este módulo apenas troca o <header> original pelo header do portal e
atualiza o <title>. O resto do arquivo fica 100% intacto.
"""
import core as C
import re

OLD_HEADER = '<header><img id="brand" alt="Center Ônibus"><p>Campanhas comerciais<br><strong>Troque os produtos. Mantenha a marca.</strong></p><span class="tag">MODELO REUTILIZÁVEL · COMMET</span></header>'

NEW_HEADER = """<header style="background:#0b1e35;color:#fff;padding:0 26px;height:60px;display:flex;align-items:center;gap:16px;font-family:Inter,Arial,sans-serif;box-sizing:border-box;margin:0;">
  <a href="../../" style="display:flex;align-items:center"><img src="../../assets/marca/assinatura-reduzida-neg.png" alt="Center Ônibus" style="height:24px;width:auto;display:block"></a>
  <span style="width:1px;height:22px;background:rgba(255,255,255,.22);display:inline-block"></span>
  <span style="font-weight:700;font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85">Template de e-mail</span>
  <p style="margin:0;color:#becddd;font-size:14px">Campanhas comerciais<br><strong style="color:#fff">Troque os produtos. Mantenha a marca.</strong></p>
  <a href="../../" style="margin-left:auto;font-size:11px;letter-spacing:.08em;color:rgba(255,255,255,.75);text-decoration:none;padding:8px">← TODOS OS MÓDULOS</a>
</header>"""


def build():
    with open(C.RAIZ + "/template_email_src/ABRIR-EDITOR.html", encoding="utf-8") as f:
        html = f.read()

    # 1. Trocar o <title>
    html = html.replace(
        "<title>Center Ônibus | Montar e-mail</title>",
        "<title>Template de e-mail — Ecossistema Center Ônibus</title>")

    # 2. Trocar o <header> exato (string literal, sem regex)
    assert OLD_HEADER in html, "Não encontrei o <header> original no arquivo fonte!"
    html = html.replace(OLD_HEADER, NEW_HEADER)

    # 3. Manter <img id="brand"> oculto para o JS que faz brand.src = ASSETS.logo
    html = html.replace(NEW_HEADER, NEW_HEADER + '<img id="brand" style="display:none" alt="">')

    n = C.escrever("marketing/template-email/index.html", html)
    print(f"  marketing/template-email/index.html     {n//1024:>4} KB")
