#!/usr/bin/env python3
"""Monta o site do Ecossistema Center Ônibus.

    python3 build/build.py

Escreve na raiz do repositório: index.html, assets/base.{css,js} e uma pasta
por módulo. As fontes, bibliotecas e artes da marca já moram em assets/ e não
são regeradas — só o que é código passa por aqui.

Para acrescentar um módulo:
  1. crie build/mod_<nome>.py com uma função build()
  2. registre o módulo em CATEGORIAS, no core.py
  3. some ao MODULOS abaixo e rode de novo
"""
import os, sys, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import core as C
import mod_assistente, mod_login
import portal, mod_cartao, mod_cracha, mod_validador, validador_publico, mod_template_email

MODULOS = [mod_login, mod_assistente, portal, mod_cartao, mod_cracha, mod_validador, validador_publico, mod_template_email]


def main():
    print(f"Ecossistema Center Ônibus · v{C.VERSAO}\n")
    n = C.escrever("assets/base.css", C.css())
    print(f"  assets/base.css                 {n//1024:>4} KB")
    n = C.escrever("assets/base.js", C.js_base())
    print(f"  assets/base.js                  {n//1024:>4} KB")
    for m in MODULOS:
        m.build()
    C.escrever(".nojekyll", "")
    # Publicação estática contém apenas páginas e ativos; nunca o servidor/dados.
    destino = os.path.join(C.RAIZ, "dist")
    os.makedirs(destino, exist_ok=True)
    for pasta in ["assets", "marketing", "v", "login"]:
        shutil.copytree(os.path.join(C.RAIZ, pasta), os.path.join(destino, pasta), dirs_exist_ok=True)
    for arquivo in ["index.html", ".nojekyll"]:
        shutil.copy2(os.path.join(C.RAIZ, arquivo), destino)
    print("\n  pronto — abra index.html ou publique a raiz do repositório.")


if __name__ == "__main__":
    main()
