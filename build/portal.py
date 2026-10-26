#!/usr/bin/env python3
"""O portal — a porta de entrada do ecossistema, dividido em categorias."""
import core as C

ICONES = {
  "Cartão de visita":
    '<rect x="2" y="5" width="20" height="14" rx="1"/><circle cx="8" cy="11" r="2.2"/>'
    '<path d="M4.5 16.5c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4"/>'
    '<path d="M14.5 9.5h5M14.5 12.5h5M14.5 15.5h3"/>',
  "Crachá":
    '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9.5 3V1.8h5V3"/>'
    '<circle cx="12" cy="10" r="2.6"/><path d="M7.8 16.6c.9-2 2.4-3 4.2-3s3.3 1 4.2 3"/>',
  "Validador de crachá":
    '<path d="M12 2.6 20 6v6.2c0 4.4-3.2 7.9-8 9.2-4.8-1.3-8-4.8-8-9.2V6z"/>'
    '<path d="m8.6 12.2 2.4 2.4 4.6-4.8"/>',
  "Assinatura de e-mail":
    '<rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="m2.5 6.5 9.5 7 9.5-7"/>',
  "Papelaria":
    '<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 16.5h7"/>',
  "Proposta comercial":
    '<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/><path d="M8.5 12h7M8.5 15.5h4"/>',
  "Catálogo do Mercado Livre":
    '<path d="M3.5 5.5A2 2 0 0 1 5.5 4H11v16H5.5a2 2 0 0 0-2 1.5z"/>'
    '<path d="M20.5 5.5A2 2 0 0 0 18.5 4H13v16h5.5a2 2 0 0 1 2 1.5z"/>',
  "CRM":
    '<circle cx="12" cy="7" r="3"/><circle cx="5" cy="17" r="2.6"/><circle cx="19" cy="17" r="2.6"/>'
    '<path d="M9.8 9.2 7 14.6M14.2 9.2 17 14.6"/>',
  "Ficha de admissão":
    '<rect x="4" y="3" width="16" height="18" rx="1.5"/><circle cx="12" cy="9.5" r="2.6"/>'
    '<path d="M7.8 16.5c.9-2 2.4-3 4.2-3s3.3 1 4.2 3"/>',
  "Organograma":
    '<rect x="9" y="2.5" width="6" height="4.5"/><rect x="2.5" y="15" width="6" height="4.5"/>'
    '<rect x="15.5" y="15" width="6" height="4.5"/><path d="M12 7v4H5.5v4M12 11h6.5v4"/>',
  "Lista de revogados":
    '<path d="M12 2.6 20 6v6.2c0 4.4-3.2 7.9-8 9.2-4.8-1.3-8-4.8-8-9.2V6z"/>'
    '<path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/>',
  "Etiqueta de peça":
    '<path d="M3.5 10.5 10.5 3.5h7.5a2 2 0 0 1 2 2V13l-7 7z"/><circle cx="16" cy="8" r="1.4"/>',
  "Ficha de visita técnica":
    '<path d="M12 21s6.5-5.5 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.5 12 21 12 21z"/>'
    '<circle cx="12" cy="10.4" r="2.4"/>',
  "Etiqueta de expedição":
    '<path d="M3.5 8.5 12 4l8.5 4.5v7L12 20l-8.5-4.5z"/><path d="M3.5 8.5 12 13l8.5-4.5M12 13v7"/>',
}
PADRAO = '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>'


def _ic(nome):
    return ('<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'
            + ICONES.get(nome, PADRAO) + '</svg>')


def _card(m):
    ativo = bool(m.get("href"))
    tag = "Abrir módulo →" if ativo else "Em breve"
    corpo = (f'{_ic(m["nome"])}<h3>{m["nome"]}</h3><p>{m["desc"]}</p>'
             f'<span class="abrir">{tag}</span>')
    if ativo:
        return f'<a class="card" href="{m["href"]}">{corpo}</a>'
    return f'<div class="card soon">{corpo}</div>'


def _categoria(c):
    cards = "".join(_card(m) for m in c["modulos"])
    soon = "" if c["tag"] == "Ativo" else " soon"
    return f"""
  <section class="cat" id="{c['id']}">
    <div class="cat-cab">
      <h2>{c['nome']}</h2>
      <span class="tag{soon}">{c['tag']}</span>
      <p>{c['desc']}</p>
    </div>
    <div class="mods">{cards}</div>
  </section>"""


def build():
    ativos = C.modulos_ativos()
    previstos = sum(len(c["modulos"]) for c in C.CATEGORIAS) - len(ativos)
    corpo = f"""
<div class="portal">
  <div class="capa">
    <h1>Ecossistema Center Ônibus</h1>
    <p class="sub">Cada peça da operação vira um módulo aqui dentro. Crie materiais,
    emita crachás com acesso individual e acompanhe a produção de conteúdo.
    Emissões e ações administrativas ficam registradas no servidor.</p>
    <p class="sub">Abra os cartões com “Abrir módulo”. Os itens “Em breve” ainda estão em desenvolvimento.</p>
  </div>
  <div class="num">
    <div><b>{len(C.CATEGORIAS)}</b>categorias</div>
    <div><b>{len(ativos)}</b>módulos no ar</div>
    <div><b>{previstos}</b>no roadmap</div>
    <div><b>v{C.VERSAO}</b>desde {C.DATA}</div>
  </div>
{''.join(_categoria(c) for c in C.CATEGORIAS)}
  <div class="rodape">
    <b>Marca.</b> Todas as peças seguem o Manual de Marca v1.0 (agosto/2026) —
    assinatura reduzida acima de 20 mm, símbolo isolado acima de 8 mm, cores
    chapadas, sem degradê nem sombra. As artes são recortadas do manual, nunca
    redesenhadas.<br>
    <b>Crachá.</b> A validação usa assinatura Ed25519 conferida offline. A emissão
    exige acesso individual; a chave privada fica no servidor e o uso é registrado.<br>
    <b>Ecossistema Center Ônibus</b> · v{C.VERSAO} · {C.DATA} · feito pela Commet.
  </div>
</div>"""
    n = C.escrever("index.html", C.pagina(
        "Ecossistema Center Ônibus", "", corpo, modulo_nome="Portal"))
    print(f"  index.html                      {n//1024:>4} KB  ·  "
          f"{len(C.CATEGORIAS)} categorias, {len(ativos)} módulos ativos")
