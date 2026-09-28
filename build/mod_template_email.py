#!/usr/bin/env python3
import core as C
import re
import os

def build():
    with open(C.RAIZ + "/template_email_src/ABRIR-EDITOR.html", encoding="utf-8") as f:
        html = f.read()

    # Cabeçalho no padrão do portal com estilos inline para não depender do base.css
    header_portal = """
<style>
@font-face{font-family:ArchivoCond;font-weight:700;font-display:swap;src:url(../../assets/fontes/archivocond-bold.woff2) format('woff2')}
@font-face{font-family:Inter;font-weight:400;font-display:swap;src:url(../../assets/fontes/inter-400.woff2) format('woff2')}
</style>
<header style="background:#122B4A;color:#fff;padding:0 26px;height:60px;display:flex;align-items:center;gap:16px;font-family:Inter,sans-serif;box-sizing:border-box;margin:0;">
  <a href="../../"><img src="../../assets/marca/assinatura-reduzida-neg.png" alt="Center Ônibus" style="height:24px;width:auto;display:block;margin:0;"></a>
  <span style="width:1px;height:22px;background:rgba(255,255,255,.22);display:inline-block"></span>
  <span style="font-family:ArchivoCond, sans-serif;font-weight:700;font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85">Template de e-mail</span>
  <a href="../../" style="margin-left:auto;font-size:11px;letter-spacing:.08em;color:rgba(255,255,255,.75);text-decoration:none;padding:8px">← TODOS OS MÓDULOS</a>
</header>
"""

    html = re.sub(r'<header>.*?</header>', header_portal, html, flags=re.DOTALL)
    html = re.sub(r'<title>.*?</title>', '<title>Template de e-mail — Ecossistema Center Ônibus</title>', html)
    
    # Remove estilos do cabeçalho original apenas dentro da tag <style> para não corromper o JavaScript
    style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
    if style_match:
        style = style_match.group(1)
        style = re.sub(r'header\{.*?\}', '', style)
        style = re.sub(r'header img\{.*?\}', '', style)
        style = re.sub(r'header p\{.*?\}', '', style)
        style = re.sub(r'header \.tag\{.*?\}', '', style)
        html = html[:style_match.start(1)] + style + html[style_match.end(1):]

    n = C.escrever("marketing/template-email/index.html", html)
    print(f"  marketing/template-email/index.html     {n//1024:>4} KB")
