#!/usr/bin/env python3
"""Módulo Crachá — 54 × 86 mm (CR80 vertical), frente e verso.

Frente : tarja azul com o símbolo isolado, foto, nome e cargo.
Verso  : assinatura reduzida, QR de validação assinado, CPF discreto abaixo.

A chave privada fica exclusivamente no servidor. Operadores individuais
solicitam assinatura autenticada e auditada antes de imprimir.
"""
import core as C

# Frente: a tarja é baixa (21 mm, e os 7 primeiros são do furo do cordão),
# então ali vale o SÍMBOLO ISOLADO — mínimo do manual, 8 mm.
# Verso: cabe a ASSINATURA REDUZIDA, a mesma do cartão — mínimo 20 mm.
SIMB_FRENTE = 13.5      # mm de largura na tarja azul
SLOT_Y      = 7.0       # nada de arte acima disto: é onde entra o furo do cordão
ASSIN_VERSO = 32.0      # mm de largura no verso branco

# 26 mm com 57 módulos dá 0,456 mm por módulo: acima do piso de 0,4 mm que o
# celular precisa, e bem mais discreto que os 34 mm da primeira versão.
QR_MM = 26.0
QR_Y  = 25.5

CAMPOS = """
  <h2>Acesso de emissão</h2>
  <div class="chave" id="cracha-chave">
    <div class="estado"><i></i><span id="cracha-chave-txt">Acesso não conectado</span></div>
    <p>Use sua credencial individual. A emissão registra data, hora, IP e localização do navegador no servidor. Permita a localização para emitir.</p>
    <label for="cracha-acesso">Credencial individual</label><input id="cracha-acesso" type="password" autocomplete="off">
    <div class="row"><button id="cracha-entrar">Conectar</button><button id="cracha-sair" class="ghost">Sair</button></div>
  </div>

  <h2 class="mt">Dados do funcionário</h2>
  <label>Nome</label><input id="cracha-nome" value="Nome do Funcionário">
  <label>Cargo</label><input id="cracha-cargo" value="Consultor Técnico de Vendas">
  <label>CPF</label><input id="cracha-cpf" value="000.000.000-00" maxlength="14">
  <label>Válido até (MM/AAAA)</label><input id="cracha-validade" value="12/2027" maxlength="7">
  <label>Foto 3 × 4</label><input id="cracha-foto" type="file" accept="image/*">
  <div class="fixo" style="margin-top:8px"><span>emissor</span><b>Center Ônibus</b></div>
"""

JS = """
let CHAVE = null;              /* só na memória desta aba, nunca persistida */

MODULO = {                      /* a variável já existe no base.js */
  id:'cracha', titulo:'Crachá',
  impressao:{w:54,h:86,cols:3,rows:3},
  campos:['nome','cargo','cpf','validade'],
  rotulos:['Frente','Verso'],
  foto:null,

  /* ---------- token assinado --------------------------------------- */
  token(v){ return this.tokens.get(JSON.stringify([v.nome,v.cargo,v.validade])) || ''; },
  tokens:new Map(),
  urlValidacao(v){ const t=this.token(v); return t ? URL_VALIDADOR+'#'+t : ''; },
  async preparar(itens){
    if(!CHAVE) throw Error('Conecte seu acesso individual antes de emitir.');
    const geo=await CenterAccess.locate();
    for(const v of itens){
      const result=await CenterAccess.request('badges/sign',{method:'POST',body:JSON.stringify({nome:v.nome,cargo:v.cargo,validade:v.validade,location:geo})});
      this.tokens.set(JSON.stringify([v.nome,v.cargo,v.validade]), result.token);
    }
    await preview();
  },
  podeImprimir(){
    if(CHAVE) return true;
    alert('Conecte o acesso de emissão antes de imprimir.');return false;
  },

  /* ---------- faces -------------------------------------------------- */
  frente(v){
    const F=Object.hasOwn(v,'_foto')?v._foto:MODULO.foto;
    const foto = F
      ? `<image href="${F}" x="11" y="26" width="32" height="40"
           preserveAspectRatio="xMidYMid slice" clip-path="url(#cracha-cf)"/>`
      : `<rect x="11" y="26" width="32" height="40" fill="${GREY}"/>
         <g fill="#b6bec8"><circle cx="27" cy="41" r="5.4"/>
         <path d="M18.4 58c1.8-4.2 5-6.3 8.6-6.3s6.8 2.1 8.6 6.3z"/></g>
         ${T(27,63.4,'SEM FOTO',1.1,{w:500,ls:.2,fill:'#98a2ae',a:'middle'})}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 86" preserveAspectRatio="none">
      <defs><clipPath id="cracha-cf"><rect x="11" y="26" width="32" height="40"/></clipPath></defs>
      <rect width="54" height="86" fill="${WHITE}"/>
      <rect width="54" height="21" fill="${NAVY}"/>
      ${simboloC(27,%(SYF)s,%(SWF)s,true)}
      ${foto}
      <rect x="11" y="26" width="32" height="40" fill="none" stroke="${NAVY}" stroke-width=".25"/>
      ${T(27,74.2,(v.nome||'').toUpperCase(),4.2,{f:'ArchivoCond',w:700,ls:.005,a:'middle',id:'nm'})}
      ${T(27,78.4,(v.cargo||'').toUpperCase(),1.42,{w:500,ls:.18,fill:STEEL,a:'middle',id:'cg'})}
      ${faixaRodape(54,83.4,2.6)}
      <rect class="safe" x="20.5" y="3.5" width="13" height="3.5" rx="1.75" fill="none"
        stroke="${STEEL}" stroke-width=".2" stroke-dasharray=".7 .7"/>
      ${guiaSeg(54,86,4)}</svg>`;
  },

  verso(v){
    const url=MODULO.urlValidacao(v);
    const qr = url
      ? qrPath(url,%(QX)s,%(QY)s,%(QS)s)
      : `<rect x="%(QX)s" y="%(QY)s" width="%(QS)s" height="%(QS)s" fill="none"
           stroke="#c9cfd6" stroke-width=".3" stroke-dasharray="1.4 1.4"/>
         ${T(27,%(QM)s,'QR DE VALIDAÇÃO',1.05,{w:600,ls:.16,fill:'#98a2ae',a:'middle'})}
         ${T(27,%(QM2)s,'AGUARDANDO EMISSÃO',1.05,{w:600,ls:.16,fill:'#98a2ae',a:'middle'})}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 86" preserveAspectRatio="none">
      <rect width="54" height="86" fill="${WHITE}"/>
      ${assinaturaC(27,%(AYV)s,%(AWV)s,false)}
      ${T(27,20.6,'VALIDAÇÃO DO FUNCIONÁRIO',1.15,{w:600,ls:.24,fill:NAVY,a:'middle',id:'vt'})}
      ${qr}
      ${T(27,56.6,'APONTE A CÂMERA PARA VALIDAR',1.05,{w:500,ls:.18,fill:STEEL,a:'middle',id:'ap'})}
      <line x1="16" y1="63.0" x2="38" y2="63.0" stroke="${NAVY}" stroke-width=".12"/>
      ${T(27,68.4,'CPF '+(v.cpf||''),1.35,{w:500,ls:.06,fill:STEEL,a:'middle',id:'cp'})}
      ${T(27,73.6,'VÁLIDO ATÉ '+(v.validade||''),1.05,
          {w:500,ls:.12,fill:'#8a929c',a:'middle',id:'mt'})}
      ${T(27,78.8,'EM CASO DE PERDA, DEVOLVER À CENTER ÔNIBUS',1.00,
          {w:400,ls:.06,fill:'#8a929c',a:'middle',id:'pd'})}
      ${faixaRodape(54,83.4,2.6)}
      <rect class="safe" x="20.5" y="3.5" width="13" height="3.5" rx="1.75" fill="none"
        stroke="${STEEL}" stroke-width=".2" stroke-dasharray=".7 .7"/>
      ${guiaSeg(54,86,4)}</svg>`;
  },

  ajustar(root){
    root.querySelectorAll('.peca svg, .stage svg').forEach(svg=>{
      if(svg.querySelector('#nm')) shrink(svg,'nm',44);
      if(svg.querySelector('#cg')) shrink(svg,'cg',44);
      ['vt','ap','cp','mt','pd'].forEach(id=>shrink(svg,id,44));
    });
  },

  aoMontar(){
    /* ---- chave de emissão ---------------------------------------- */
    const cx=document.getElementById('cracha-chave');
    const txt=document.getElementById('cracha-chave-txt');
    const marcar=(classe,msg)=>{ cx.className='chave '+classe; txt.textContent=msg;
      document.querySelectorAll('[data-precisa-chave]')
              .forEach(b=>b.disabled=(classe!=='ok')); };
    marcar('','Chave não carregada');

    const script=document.createElement('script');script.src=BASE+'assets/access.js';
    document.getElementById('cracha-entrar').disabled=true;
    script.onload=()=>document.getElementById('cracha-entrar').disabled=false;
    document.body.append(script);
    document.getElementById('cracha-entrar').onclick=async()=>{
      CHAVE=null;MODULO.tokens.clear();document.getElementById('print').replaceChildren();
      const input=document.getElementById('cracha-acesso');
      try{
        CenterAccess.credential=input.value.trim(); input.value='';
        const me=await CenterAccess.request('me');
        if(!me.roles.some(r=>['admin','issuer'].includes(r)))throw Error('Acesso sem permissão de emissão.');
        CHAVE=true;marcar('ok','Conectado como '+me.id+' — emissão rastreada');
      }catch(e){CHAVE=null;CenterAccess.credential='';marcar('erro',e.message);}
    };
    document.getElementById('cracha-sair').onclick=()=>{
      CHAVE=null;if(window.CenterAccess)CenterAccess.credential='';MODULO.tokens.clear();
      document.getElementById('print').replaceChildren();marcar('','Acesso encerrado');preview();
    };

    /* ---- foto ----------------------------------------------------- */
    document.getElementById('cracha-foto').addEventListener('change',e=>{
      const f=e.target.files[0]; if(!f) return;
      if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024){alert('Use uma foto JPG, PNG ou WebP de até 10 MB.');return;}
      const r=new FileReader();
      r.onload=()=>{ MODULO.foto=r.result; preview(); };
      r.readAsDataURL(f);
    });

    /* ---- CPF ------------------------------------------------------ */
    const cpf=document.getElementById('cracha-cpf');
    cpf.addEventListener('input',()=>{
      let d=cpf.value.replace(/\\D/g,'').slice(0,11);
      cpf.value = d.replace(/(\\d{3})(\\d)/,'$1.$2')
                   .replace(/(\\d{3})\\.(\\d{3})(\\d)/,'$1.$2.$3')
                   .replace(/\\.(\\d{3})(\\d{1,2})$/,'.$1-$2');
      preview();
    });
  }
};
async function gerarQR(){try{await MODULO.preparar([dados()]);}catch(e){alert(e.message);}}
MODULO.faces = [MODULO.frente, MODULO.verso];
iniciar(MODULO);
window.addEventListener('beforeprint',()=>{if(!document.getElementById('print').children.length)alert('Use os botões de emissão para registrar e preparar o crachá.');});
""" % dict(SWF=SIMB_FRENTE,
           SYF=round(SLOT_Y + (21.0 - SLOT_Y - SIMB_FRENTE/C.SIMB_RATIO)/2, 4),
           AWV=ASSIN_VERSO, AYV=round(11.3 - (ASSIN_VERSO/C.ASSIN_RATIO)/2, 4),
           QS=QR_MM, QX=round((54.0 - QR_MM)/2, 4), QY=QR_Y,
           QM=round(QR_Y + QR_MM/2 - 1.2, 4), QM2=round(QR_Y + QR_MM/2 + 1.6, 4))


def build():
    corpo = f"""
<style id="pagerule">@page{{size:54mm 86mm;margin:0}}</style>
<main>
  <div class="panel">
    {CAMPOS}
    <div class="row"><button data-precisa-chave onclick="gerarQR()">Gerar QR e conferir</button></div>
    <h2 class="mt">Impressão</h2>
    <div class="seg">
      <button data-m="unit" class="on" onclick="setImp('unit')">Peça única</button>
      <button data-m="a4" onclick="setImp('a4')">Folha A4</button>
    </div>
    <div class="row">
      <button class="red" data-precisa-chave onclick="imprimirUm()">Imprimir este</button>
      <button class="ghost" data-precisa-chave onclick="imprimirLista()">Imprimir a lista</button>
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
    n = C.escrever("marketing/cracha/index.html", C.pagina(
        "Crachá — Ecossistema Center Ônibus", "../../", corpo,
        modulo_nome="Crachá", scripts=["qrcode.js", "nacl-fast.min.js"], js=JS,
        descricao="Gerador de crachá 54 × 86 mm com QR de validação assinado."))
    print(f"  marketing/cracha/index.html     {n//1024:>4} KB")
