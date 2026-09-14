#!/usr/bin/env python3
"""Módulo Cartão de visita — 90 × 50 mm, frente e verso.

As duas faces assinam com a ASSINATURA REDUZIDA do manual (símbolo mais
CENTER ÔNIBUS, sem o descritor). Redução mínima dessa versão: 20 mm.
"""
import core as C

ASSIN_FRENTE = 46.0     # mm de largura na frente azul
ASSIN_VERSO  = 28.0     # mm de largura no verso branco

CAMPOS = f"""
  <h2>Dados do vendedor</h2>
  <label>Nome</label><input id="cartao-nome" value="Nome do Vendedor">
  <label>Cargo</label><input id="cartao-cargo" value="Consultor Técnico de Vendas">
  <label>Telefone fixo</label><input id="cartao-fixo" value="(11) 2967-3002 · ramal 000">
  <label>Celular / WhatsApp</label><input id="cartao-celular" value="(11) 90000-0000 · WhatsApp">
  <label>E-mail</label><input id="cartao-email" value="nome@centeronibus.com.br">
  <label>Link do QR code</label><input id="cartao-qr" value="https://centeronibus.com.br">
  <label>Site impresso no cartão</label>
  <div class="fixo"><span>fixo em todos</span><b>{C.SITE_LINE}</b></div>
"""

JS = """
MODULO = {                      /* a variável já existe no base.js */
  id:'cartao', titulo:'Cartão de visita',
  impressao:{w:90,h:50,cols:2,rows:5},
  campos:['nome','cargo','fixo','celular','email','qr'],
  rotulos:['Frente','Verso'],

  frente(){
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 50" preserveAspectRatio="none">
      <rect width="90" height="50" fill="${NAVY}"/>
      ${assinaturaC(45,%(SY)s,%(SW)s,true)}
      ${MONT_SVG}
      ${faixaRodape(90,47.4,2.6)}
      ${guiaSeg(90,50,4)}</svg>`;
  },

  verso(v){
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 50" preserveAspectRatio="none">
      <rect width="90" height="50" fill="${WHITE}"/>
      ${assinatura(7,%(BY)s,%(SB)s,false)}
      ${T(83,10.0,ESTADOS,1.05,{w:500,ls:.12,fill:STEEL,a:'end',id:'m1'})}
      <line x1="7" y1="19.6" x2="83" y2="19.6" stroke="${NAVY}" stroke-width=".14"/>
      ${T(7,26.1,(v.nome||'').toUpperCase(),4.6,{f:'ArchivoCond',w:700,ls:.005,id:'nm'})}
      ${T(7,29.8,(v.cargo||'').toUpperCase(),1.42,{w:500,ls:.20,fill:STEEL,id:'cg'})}
      ${T(7,34.4,v.fixo,1.66,{id:'k1'})}
      ${T(7,37.6,v.celular,1.66,{id:'k2'})}
      ${T(7,40.8,v.email,1.66,{id:'k3'})}
      ${T(7,42.6,SITE,1.66,{w:600,id:'k4'})}
      ${qrPath(v.qr,69,23.5,14)}
      <rect x="69" y="39.6" width="14" height="3" rx=".5" fill="${RED}"/>
      ${T(76,41.6,'ACESSO RÁPIDO',1.00,{w:600,ls:.06,fill:'#fff',a:'middle',id:'pill'})}
      ${guiaSeg(90,50,4)}</svg>`;
  },

  ajustar(root){
    root.querySelectorAll('.peca svg, .stage svg').forEach(svg=>{
      if(!svg.querySelector('#nm')) return;
      ['nm','cg','k1','k2','k3','k4'].forEach(id=>shrink(svg,id,60));
      shrink(svg,'m1',46); shrink(svg,'pill',11.6);
    });
  }
};
MODULO.faces = [MODULO.frente, MODULO.verso];
iniciar(MODULO);
""" % dict(SW=ASSIN_FRENTE, SY=round((36.1 - ASSIN_FRENTE/C.ASSIN_RATIO)/2, 4),
           SB=ASSIN_VERSO,  BY=round(9.5 - (ASSIN_VERSO/C.ASSIN_RATIO)/2, 4))


def build():
    corpo = f"""
<style id="pagerule">@page{{size:90mm 50mm;margin:0}}</style>
<main>
  <div class="panel">
    {CAMPOS}
    <h2 class="mt">Impressão</h2>
    <div class="seg">
      <button data-m="unit" class="on" onclick="setImp('unit')">Peça única</button>
      <button data-m="a4" onclick="setImp('a4')">Folha A4</button>
    </div>
    <div class="row">
      <button class="red" onclick="imprimirUm()">Imprimir este</button>
      <button class="ghost" onclick="imprimirLista()">Imprimir a lista</button>
    </div>
    <div class="row">
      <button onclick="adicionar()">Adicionar à lista</button>
      <button class="ghost" onclick="toggleGuias()">Margens</button>
    </div>
    <div class="lista" id="lista"></div>
    <p class="hint" id="hint"></p>
  </div>
  <div class="stage" id="stage"></div>
</main>
<div id="print" class="m-unit"></div>"""
    n = C.escrever("marketing/cartao/index.html", C.pagina(
        "Cartão de visita — Ecossistema Center Ônibus", "../../", corpo,
        modulo_nome="Cartão de visita", scripts=["qrcode.js"],
        js_antes=f"const MONT_SVG=`{C.MONT_SVG}`;", js=JS,
        descricao="Gerador de cartão de visita 90 × 50 mm da Center Ônibus."))
    print(f"  marketing/cartao/index.html     {n//1024:>4} KB")
