#!/usr/bin/env python3
import core as C
import re
import os

def build():
    with open(C.RAIZ + "/template_email_src/ABRIR-EDITOR.html", encoding="utf-8") as f:
        html = f.read()

    # Extract style
    style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
    style = style_match.group(1) if style_match else ""
    
    # Remove header CSS and body CSS to fit portal's identity
    style = re.sub(r'header\{.*?\}', '', style)
    style = re.sub(r'header img\{.*?\}', '', style)
    style = re.sub(r'header p\{.*?\}', '', style)
    style = re.sub(r'header \.tag\{.*?\}', '', style)
    style = re.sub(r'body\{.*?\}', '', style)
    
    # Extract everything after <header>...</header>
    main_match = re.search(r'</header>(.*?)</body>', html, re.DOTALL)
    main_content = main_match.group(1) if main_match else ""

    corpo = f"<style>{style}</style>\n{main_content}"
    
    n = C.escrever("marketing/template-email/index.html", C.pagina(
        titulo="Template de e-mail — Ecossistema Center Ônibus",
        base="../../",
        corpo=corpo,
        modulo_nome="Template de e-mail",
        descricao="Gerador de template promocional da Center Ônibus."
    ))
    print(f"  marketing/template-email/index.html     {n//1024:>4} KB")
