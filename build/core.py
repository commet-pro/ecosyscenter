#!/usr/bin/env python3
"""Núcleo do Ecossistema Center Ônibus.

Aqui mora tudo que é da marca ou é infraestrutura: cores, tipografia, as artes
da assinatura, o CSS e o JS compartilhados. Cada módulo importa daqui e só
descreve o que é dele.

Diferente da versão antiga (um HTML gigante com tudo embutido), aqui o site é
servido de arquivos separados: fonte, biblioteca e arte carregam uma vez e o
navegador guarda em cache. As páginas ficam pequenas.
"""
import json, os, shutil, hashlib

BUILD = os.path.dirname(os.path.abspath(__file__))
RAIZ  = os.path.dirname(BUILD)                 # a raiz do repositório é a raiz do site

# ------------------------------------------------------------------ marca
# Paleta e tipografia conforme o Manual de Marca v1.0 (agosto/2026), páginas
# 14 e 15. As artes saem da página VERSÕES E ASSINATURAS — ver marca/LEIA-ME.
NAVY, STEEL, RED = "#122B4A", "#2E6DA4", "#C8102E"
GREY, WHITE, BLACK = "#E4E7EB", "#F4F4F4", "#101418"

CAP_ARCH, CAP_INTER = 0.686, 0.728             # altura de caixa alta / em

ESTADOS    = "SÃO PAULO · BAHIA · RIO DE JANEIRO"
SITE_LINE  = "www.centeronibus.com.br"
TEL_GERAL  = "(11) 2967-3002"
MONTADORAS = ["BUSSCAR", "COMIL", "CAIO", "MASCARELLO"]

_SIMB  = json.load(open(f"{RAIZ}/assets/marca/simbolo-metrics.json"))
_ASSIN = json.load(open(f"{RAIZ}/assets/marca/assinatura-metrics.json"))

SIMB_RATIO,  SIMB_MIN  = _SIMB["cor"]["ratio"], 8.0     # símbolo isolado, mín. 8 mm
ASSIN_RATIO, ASSIN_MIN = _ASSIN["ratio"],      20.0     # assinatura reduzida, mín. 20 mm

# só a chave pública entra no repositório. A privada fica com quem emite.
CHAVE_PUBLICA  = json.load(open(f"{BUILD}/chave-publica.json"))["pub_b64"]
URL_VALIDADOR  = os.environ.get("VALIDATOR_URL", "")

# montadoras já posicionadas para a frente do cartão
MONT_SVG = "".join(
    f'<g transform="translate({v["tx"]},{v["ty"]}) scale({v["s"]})">{v["body"]}</g>'
    for v in json.load(open(f"{BUILD}/montadoras.json", encoding="utf-8")).values())

VERSAO = "3.1"
DATA   = "23/10/2026"


# --------------------------------------------------------------- catálogo
# O portal se organiza em categorias; cada categoria tem módulos. Módulo sem
# `href` é roadmap: aparece apagado, não clica.
CATEGORIAS = [
  dict(id="marketing", nome="Marca e Marketing", tag="Ativo",
       desc="As peças que levam a marca para fora — papelaria, identificação e "
            "o que prova que a pessoa é da Center.",
       modulos=[
         dict(nome="Cartão de visita", href="marketing/cartao/",
              desc="90 × 50 mm, frente e verso, com QR de acesso rápido. Sai "
                   "pronto para a gráfica ou em folha A4."),
         dict(nome="Crachá", href="marketing/cracha/",
              desc="54 × 86 mm com foto, nome e cargo. No verso, um QR assinado "
                   "que prova o vínculo, e o CPF discreto abaixo."),
         dict(nome="Validador de crachá", href="marketing/validador/",
              desc="Lê o QR pela câmera e diz se o crachá é autêntico. Funciona "
                   "offline e não consegue emitir — só conferir."),
         dict(nome="Template de e-mail", href="marketing/template-email/",
              desc="Gerador de template promocional em HTML para campanhas "
                   "comerciais, com exportação para plataformas de envio."),
         dict(nome="Assistente de conteúdo", href="marketing/assistente/", desc="Pesquisa com fontes, artigos e programação editorial com IA."),
         dict(nome="Assinatura de e-mail", desc="Bloco de assinatura padronizado, "
              "pronto para colar no Gmail e no Outlook."),
         dict(nome="Papelaria", desc="Timbrado, envelope e pasta na identidade nova."),
       ]),
  dict(id="comercial", nome="Comercial", tag="Em construção",
       desc="Do primeiro contato ao pedido fechado.",
       modulos=[
         dict(nome="Proposta comercial", desc="Proposta com peças, prazos e "
              "condições, no padrão da marca."),
         dict(nome="Catálogo de peças", desc="Catálogo filtrável por carroceria, "
              "com código e aplicação."),
         dict(nome="CRM", desc="Onde os módulos passam a compartilhar os mesmos "
              "dados de cliente e de pedido."),
       ]),
  dict(id="pessoas", nome="Pessoas", tag="Em construção",
       desc="Quem trabalha na Center, e o que a operação precisa saber sobre isso.",
       modulos=[
         dict(nome="Ficha de admissão", desc="Cadastro do funcionário que alimenta "
              "o crachá sem redigitar nada."),
         dict(nome="Organograma", desc="Estrutura por unidade, sempre atual."),
         dict(nome="Lista de revogados", desc="O que falta para o crachá deixar de "
              "valer no desligamento, e não só no vencimento."),
       ]),
  dict(id="operacoes", nome="Operações", tag="Em construção",
       desc="O que acontece entre o pedido e a peça na mão do cliente.",
       modulos=[
         dict(nome="Etiqueta de peça", desc="Código, medida e aplicação — o padrão "
              "CO 11084 que já está no manual."),
         dict(nome="Ficha de visita técnica", desc="Registro de campo com foto, "
              "aplicação e parecer."),
         dict(nome="Etiqueta de expedição", desc="Volume, destino e conferência."),
       ]),
]


def modulos_ativos():
    return [(c, m) for c in CATEGORIAS for m in c["modulos"] if m.get("href")]


# ------------------------------------------------------------------- CSS
def css():
    ff = "\n".join(
        f"@font-face{{font-family:{fam};font-weight:{w};font-display:swap;"
        f"src:url(fontes/{k}.woff2) format('woff2')}}"
        for k, fam, w in [("archivocond-bold", "ArchivoCond", 700),
                          ("inter-400", "Inter", 400),
                          ("inter-500", "Inter", 500),
                          ("inter-600", "Inter", 600)])
    corpo = """
:root{--navy:__NAVY__;--steel:__STEEL__;--red:__RED__;--grey:__GREY__;--white:__WHITE__}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;color:var(--navy);
  background:var(--grey);-webkit-font-smoothing:antialiased}
a{color:inherit}

/* ---------------------------------------------------------- cabeçalho */
header{background:var(--navy);color:#fff;padding:0 26px;height:60px;display:flex;
  align-items:center;gap:16px}
header img.logo{height:24px;width:auto;display:block}
header .sep{width:1px;height:22px;background:rgba(255,255,255,.22)}
header .mod{font-family:ArchivoCond;font-weight:700;font-size:13px;
  letter-spacing:.18em;text-transform:uppercase;opacity:.85}
header .voltar{margin-left:auto;font-size:11px;letter-spacing:.08em;
  color:rgba(255,255,255,.75);text-decoration:none;padding:8px}
header .voltar:hover{color:#fff}
@media(max-width:560px){
  header{padding:0 16px;gap:10px}
  header .mod{font-size:11px;letter-spacing:.12em}
}

/* ------------------------------------------------------------- portal */
.portal{max-width:1060px;margin:0 auto;padding:56px 26px 48px}
.portal .capa{max-width:64ch}
.portal h1{font-family:ArchivoCond;font-weight:700;font-size:clamp(32px,6vw,46px);
  line-height:1;letter-spacing:.005em;text-transform:uppercase;margin:0 0 12px}
.portal .sub{font-size:15px;line-height:1.65;color:#5c6672;margin:0}
.portal .num{display:flex;gap:26px;flex-wrap:wrap;margin:30px 0 0;
  padding-top:22px;border-top:1px solid #d3d8de}
.portal .num div{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a929c}
.portal .num b{display:block;font-family:ArchivoCond;font-weight:700;font-size:26px;
  letter-spacing:0;color:var(--navy);margin-bottom:2px}

.cat{margin-top:52px}
.cat-cab{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;
  padding-bottom:10px;border-bottom:2px solid var(--navy)}
.cat-cab h2{font-family:ArchivoCond;font-weight:700;font-size:22px;margin:0;
  text-transform:uppercase;letter-spacing:.03em}
.cat-cab .tag{font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  font-weight:600;padding:3px 8px;background:var(--navy);color:#fff}
.cat-cab .tag.soon{background:#fff;color:#8a929c;border:1px solid #c9cfd6}
.cat-cab p{margin:0;font-size:12px;line-height:1.55;color:#6b7480;flex:1 1 260px}

.mods{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));
  gap:16px;margin-top:20px}
.card{background:#fff;border:1px solid #d3d8de;padding:20px;display:flex;
  flex-direction:column;gap:9px;text-decoration:none;color:var(--navy);
  transition:.15s;min-height:152px}
a.card:hover{border-color:var(--navy);transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(18,43,74,.10)}
.card .ic{width:30px;height:30px;color:var(--steel)}
.card h3{font-family:ArchivoCond;font-weight:700;font-size:18px;margin:0;
  text-transform:uppercase;letter-spacing:.02em}
.card p{margin:0;font-size:12px;line-height:1.55;color:#6b7480}
.card .abrir{margin-top:auto;font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--red);font-weight:600}
.card.soon{background:transparent;border-style:dashed;border-color:#c9cfd6}
.card.soon h3,.card.soon .ic{color:#9aa3ad}
.card.soon .abrir{color:#9aa3ad}

.rodape{margin-top:56px;padding-top:20px;border-top:1px solid #d3d8de;
  font-size:11px;line-height:1.7;color:#8a929c;max-width:70ch}
.rodape b{color:#6b7480}

/* -------------------------------------------------------- painel/peça */
main{display:grid;grid-template-columns:344px 1fr;gap:26px;padding:26px;
  align-items:start;max-width:1320px}
@media(max-width:940px){main{grid-template-columns:1fr}}
.panel{background:#fff;border:1px solid #d3d8de;padding:20px}
.panel h2{font-family:ArchivoCond;font-weight:700;font-size:13px;
  letter-spacing:.18em;text-transform:uppercase;color:var(--steel);
  margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--grey)}
.panel h2.mt{margin-top:22px}
label{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  font-weight:500;color:var(--steel);margin:12px 0 4px}
input,select{width:100%;padding:8px 10px;border:1px solid #c9cfd6;font:inherit;
  font-size:13px;color:var(--navy);background:#fff}
input:focus,select:focus{outline:2px solid var(--steel);outline-offset:-1px}
input[type=file]{padding:6px;font-size:11px}
.fixo{background:var(--grey);color:#6b7480;font-size:12px;padding:8px 10px;
  border:1px dashed #c9cfd6;display:flex;justify-content:space-between;gap:8px}
.fixo b{color:var(--navy);font-weight:600}
.row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
button{font:inherit;font-size:12px;font-weight:600;letter-spacing:.05em;
  padding:10px 14px;border:0;cursor:pointer;background:var(--navy);color:#fff}
button.ghost{background:#fff;color:var(--navy);border:1px solid var(--navy)}
button.red{background:var(--red)}
button:hover{opacity:.88}
button[disabled]{opacity:.4;cursor:not-allowed}
.seg{display:flex;margin-top:16px;border:1px solid var(--navy)}
.seg button{flex:1;background:#fff;color:var(--navy);border:0;font-size:11px;padding:9px 6px}
.seg button.on{background:var(--navy);color:#fff}
.hint{font-size:11px;line-height:1.6;color:#6b7480;margin:14px 0 0}
.hint b{color:var(--navy)}
.lista{margin-top:6px;font-size:12px}
.lista div{display:flex;justify-content:space-between;gap:8px;padding:6px 0;
  border-bottom:1px solid var(--grey)}
.lista a{color:var(--red);cursor:pointer;font-weight:600}
.stage{display:flex;flex-wrap:wrap;gap:22px;align-items:flex-start}
.cap{font-family:ArchivoCond;font-weight:700;font-size:11px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--steel);margin-bottom:6px}
.peca{display:block;overflow:hidden;box-shadow:0 2px 14px rgba(18,43,74,.18);
  max-width:100%}
.peca svg{display:block;width:100%;height:100%}
.safe{display:none}
.guias .safe{display:block}
#print{position:absolute;left:-99999px;top:0;width:210mm}

/* ------------------------------------------------------------- chave */
.chave{border:1px solid #c9cfd6;padding:12px;margin-top:6px;font-size:11px;
  line-height:1.6;color:#6b7480;background:var(--grey)}
.chave .estado{display:flex;align-items:center;gap:7px;font-weight:600;
  font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}
.chave .estado i{width:8px;height:8px;border-radius:50%;background:var(--red);
  display:block;flex:none}
.chave.ok .estado{color:#1f7a4d}
.chave.ok .estado i{background:#1f7a4d}
.chave.erro .estado{color:var(--red)}

/* --------------------------------------------------------- validador */
.livre{max-width:620px;margin:0 auto;padding:26px}
.res{margin-top:18px}
.res .cx{border:1px solid var(--navy);border-top:4px solid var(--navy);padding:18px;
  background:#fff}
.res .tit{display:flex;align-items:center;gap:8px;font-family:ArchivoCond;
  font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase}
.res .nome{font-family:ArchivoCond;font-weight:700;font-size:28px;line-height:1.05;
  text-transform:uppercase;margin:12px 0 3px}
.res .cargo{font-size:12px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--steel);font-weight:500}
.res .meta{font-size:11px;color:#6b7480;margin-top:11px;line-height:1.6}
video{width:100%;display:block;background:#000}

@media print{
  html,body{background:#fff;margin:0;padding:0;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  header,main,.portal,.livre{display:none!important}
  #print{position:static;left:auto;top:auto;width:auto;margin:0;padding:0;line-height:0}
  .safe{display:none!important}
  .peca{box-shadow:none!important}
  #print.m-unit .peca+.peca{break-before:page}
  #print.m-unit .peca{break-inside:avoid}
  #print.m-a4 .folha{position:relative;width:210mm;height:297mm;overflow:hidden;
    break-after:page}
  #print.m-a4 .folha:last-child{break-after:auto}
  #print.m-a4 .grade{position:absolute;display:grid}
  #print.m-a4 .marcas{position:absolute;inset:0;width:210mm;height:297mm}
}
"""
    for k, v in (("__NAVY__", NAVY), ("__STEEL__", STEEL), ("__RED__", RED),
                 ("__GREY__", GREY), ("__WHITE__", WHITE)):
        corpo = corpo.replace(k, v)
    return ff + corpo


# -------------------------------------------------------------------- JS
def js_base():
    """Helpers de todo módulo: texto SVG, artes da marca, QR e impressão.

    A página define BASE (o caminho até a raiz do site) antes de carregar este
    arquivo, e depois chama iniciar(MODULO)."""
    cabeca = (
      f'const NAVY="{NAVY}", STEEL="{STEEL}", RED="{RED}", '
      f'WHITE="{WHITE}", GREY="{GREY}";\n'
      f'const CAP_ARCH={CAP_ARCH}, CAP_INTER={CAP_INTER};\n'
      f'const SIMB_RATIO={SIMB_RATIO}, SIMB_MIN={SIMB_MIN};\n'
      f'const ASSIN_RATIO={ASSIN_RATIO}, ASSIN_MIN={ASSIN_MIN};\n'
      f'const ESTADOS="{ESTADOS}", SITE="{SITE_LINE}", TEL_GERAL="{TEL_GERAL}";\n'
      f'const CHAVE_PUBLICA="{CHAVE_PUBLICA}";\n'
      f'const URL_VALIDADOR={json.dumps(URL_VALIDADOR)} || new URL(BASE+"v/",location.href).href;')
    return cabeca + r"""
const MARCA = BASE + 'assets/marca/';
const SIMB_COR = MARCA+'simbolo-cor.png',  SIMB_NEG = MARCA+'simbolo-negativo.png';
const ASSIN_COR= MARCA+'assinatura-reduzida-cor.png',
      ASSIN_NEG= MARCA+'assinatura-reduzida-neg.png';

const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cap = (mm,f) => mm/(f==='ArchivoCond'?CAP_ARCH:CAP_INTER);

/* ---------------------------------------------------------- base64url */
const b64uBytes = s => {
  s = s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s += '=';
  const b = atob(s), a = new Uint8Array(b.length);
  for (let i=0;i<b.length;i++) a[i] = b.charCodeAt(i);
  return a;
};
const bytesB64u = a => btoa(String.fromCharCode(...a))
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

/* ------------------------------------------------------------- texto */
function T(x,y,txt,capmm,o){
  o = o||{}; const f = o.f||'Inter', size = cap(capmm,f);
  return `<text ${o.id?`id="${o.id}"`:''} x="${x}" y="${y}" font-family="${f}"
    font-weight="${o.w||400}" font-size="${size}" letter-spacing="${(o.ls||0)*size}"
    fill="${o.fill||NAVY}" text-anchor="${o.a||'start'}"
    xml:space="preserve">${esc(txt)}</text>`;
}

/* encolhe o texto até caber na largura útil */
function shrink(svg,id,max){
  const e = svg.querySelector('#'+id); if(!e) return;
  let s = parseFloat(e.getAttribute('font-size'));
  let l = parseFloat(e.getAttribute('letter-spacing'))||0;
  for (let i=0; i<60 && e.getComputedTextLength()>max; i++){
    s *= 0.97; l *= 0.97;
    e.setAttribute('font-size',s); e.setAttribute('letter-spacing',l);
  }
}

/* ------------------------------------------------------- artes da marca
   simbolo    = só o símbolo (mínimo 8 mm)
   assinatura = símbolo + CENTER ÔNIBUS, sem descritor (mínimo 20 mm)      */
const arte = (h,x,y,w,r) =>
  `<image href="${h}" x="${x}" y="${y}" width="${w}" height="${(w/r).toFixed(4)}"/>`;
const simbolo      = (x,y,w,neg) => arte(neg?SIMB_NEG:SIMB_COR,  x,y,w,SIMB_RATIO);
const assinatura   = (x,y,w,neg) => arte(neg?ASSIN_NEG:ASSIN_COR,x,y,w,ASSIN_RATIO);
const simboloC     = (cx,y,w,neg) => simbolo(cx-w/2,y,w,neg);
const assinaturaC  = (cx,y,w,neg) => assinatura(cx-w/2,y,w,neg);

/* QR chapado, sem fundo — a zona de silêncio é o espaço vazio da peça */
function qrPath(txt,x,y,size,cor){
  const t = (txt||'').trim(); if(!t) return '';
  let q; try{ q = qrcode(0,'M'); q.addData(t); q.make(); }catch(e){ return ''; }
  const n = q.getModuleCount(), st = size/n; let d = '';
  for (let r=0;r<n;r++){
    let run = null;
    for (let c=0;c<=n;c++){
      const on = c<n && q.isDark(r,c);
      if (on && run===null) run = c;
      else if (!on && run!==null){
        d += `M${(x+run*st).toFixed(3)} ${(y+r*st).toFixed(3)}h${((c-run)*st).toFixed(3)}v${st.toFixed(3)}h-${((c-run)*st).toFixed(3)}z`;
        run = null;
      }
    }
  }
  return `<path d="${d}" fill="${cor||NAVY}" shape-rendering="crispEdges"/>`;
}

const faixaRodape = (w,y,h) =>
  `<rect x="0" y="${y}" width="${w*0.56}" height="${h}" fill="${NAVY}"/>
   <rect x="${w*0.56}" y="${y}" width="${w*0.16}" height="${h}" fill="${RED}"/>
   <rect x="${w*0.72}" y="${y}" width="${w*0.28}" height="${h}" fill="${STEEL}"/>`;

const guiaSeg = (w,h,m) =>
  `<rect class="safe" x="${m}" y="${m}" width="${w-2*m}" height="${h-2*m}"
     fill="none" stroke="${STEEL}" stroke-width=".12" stroke-dasharray=".8 .8"/>`;

/* ---------------------------------------------------------- impressão */
let MODULO = null, lista = [], guias = false, modoImp = 'unit';

const DICAS = {
  unit: () => `<b>Peça única.</b> Uma face por página, no tamanho exato
    (${MODULO.impressao.w} × ${MODULO.impressao.h} mm) — é o que a gráfica espera.<br>
    Imprimir → <b>Margens: Nenhuma</b> → <b>Escala: 100 %</b> →
    marcar <b>Gráficos de plano de fundo</b>.`,
  a4: () => `<b>Folha A4.</b> ${MODULO.impressao.cols*MODULO.impressao.rows} por folha,
    com marcas de corte. Sai uma folha de frentes e uma de versos, já espelhada
    por coluna para o duplex bater.<br>
    Imprimir → <b>Papel A4</b> → <b>Margens: Nenhuma</b> → <b>Escala: 100 %</b> →
    <i>frente e verso, virar na borda longa</i>.`
};

function setImp(m){
  modoImp = m;
  const mm = MODULO.impressao;
  document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  document.getElementById('pagerule').textContent =
    m==='unit' ? `@page{size:${mm.w}mm ${mm.h}mm;margin:0}` : '@page{size:A4;margin:0}';
  document.getElementById('print').className = m==='unit' ? 'm-unit' : 'm-a4';
  const h = document.getElementById('hint'); if(h) h.innerHTML = DICAS[m]();
}

function pecaEl(html){
  const mm = MODULO.impressao;
  const el = document.createElement('div'); el.className = 'peca';
  el.style.width = mm.w+'mm'; el.style.height = mm.h+'mm';
  el.innerHTML = html; return el;
}

function marcasA4(){
  const mm = MODULO.impressao;
  const mx = (210-mm.cols*mm.w)/2, my = (297-mm.rows*mm.h)/2;
  let d = '';
  for (let i=0;i<=mm.cols;i++){ const x = mx+i*mm.w; d += `M${x} ${my-4.5}v3M${x} ${297-my+1.5}v3`; }
  for (let j=0;j<=mm.rows;j++){ const y = my+j*mm.h; d += `M${mx-4.5} ${y}h3M${210-mx+1.5} ${y}h3`; }
  return `<svg class="marcas" viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" stroke="#101418" stroke-width=".14" fill="none"/></svg>`;
}

function folhaA4(pecas){
  const mm = MODULO.impressao;
  const mx = (210-mm.cols*mm.w)/2, my = (297-mm.rows*mm.h)/2;
  const f = document.createElement('div'); f.className = 'folha';
  f.innerHTML = marcasA4();
  const g = document.createElement('div'); g.className = 'grade';
  g.style.cssText = `left:${mx}mm;top:${my}mm;width:${mm.cols*mm.w}mm;height:${mm.rows*mm.h}mm;
    grid-template-columns:repeat(${mm.cols},${mm.w}mm);grid-template-rows:repeat(${mm.rows},${mm.h}mm)`;
  pecas.forEach(p=>g.appendChild(p));
  f.appendChild(g); return f;
}

async function montarImpressao(itens){
  const box = document.getElementById('print'); box.innerHTML = '';
  const mm = MODULO.impressao, faces = MODULO.faces;
  if (modoImp === 'unit'){
    for (const v of itens)
      for (const face of faces) box.appendChild(pecaEl(await face(v)));
    MODULO.ajustar(box); return;
  }
  const n = mm.cols*mm.rows;
  for (const v of itens){
    for (let fi=0; fi<faces.length; fi++){
      const html = await faces[fi](v);
      let ps = Array.from({length:n}, () => pecaEl(html));
      if (fi%2 === 1){                       // verso espelhado por coluna (duplex)
        const esp = [];
        for (let r=0;r<mm.rows;r++) esp.push(...ps.slice(r*mm.cols,(r+1)*mm.cols).reverse());
        ps = esp;
      }
      box.appendChild(folhaA4(ps));
    }
  }
  MODULO.ajustar(box);
}

async function imprimir(itens){
  if (MODULO.podeImprimir && !MODULO.podeImprimir()) return;
  try {
    if(window.CenterAccess?.user)await CenterAccess.track('material.print',MODULO.id,itens.length);
    if(MODULO.preparar) await MODULO.preparar(itens);
    await montarImpressao(itens);
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('#print image')].map(e=>new Promise(resolve=>{const img=new Image();img.onload=resolve;img.onerror=resolve;img.src=e.getAttribute('href');})));
    window.print();
  } catch(e) {document.getElementById('print').replaceChildren();alert(e.message);}
}

/* --------------------------------------------------------------- shell */
const campoEl = k => document.getElementById(MODULO.id+'-'+k);
const dados = () => Object.fromEntries(MODULO.campos.map(k => {
  const el = campoEl(k); return [k, el ? el.value : ''];
}));

let previewRevision=0;
async function preview(){
  const revision=++previewRevision;
  const st = document.getElementById('stage');
  const fragment=document.createDocumentFragment();
  st.innerHTML = '';
  for (let i=0; i<MODULO.faces.length; i++){
    const box = document.createElement('div');
    const cap = document.createElement('div');
    cap.className = 'cap'; cap.textContent = MODULO.rotulos[i];
    const p = document.createElement('div');
    p.className = 'peca' + (guias?' guias':'');
    p.style.width = MODULO.impressao.w+'mm'; p.style.height = MODULO.impressao.h+'mm';
    p.innerHTML = await MODULO.faces[i](dados());
    box.append(cap,p); fragment.appendChild(box);
  }
  if(revision!==previewRevision)return;
  st.replaceChildren(fragment);
  await document.fonts.ready;
  if(revision===previewRevision)MODULO.ajustar(st);
}

function imprimirUm(){ imprimir([dados()]); }
function imprimirLista(){ imprimir(lista.length?lista:[dados()]); }
async function adicionar(){
  try{if(window.CenterAccess?.user)await CenterAccess.track('material.list.add',MODULO.id);lista.push({...dados(),_foto:MODULO.foto});refresh();}catch(e){alert('Não foi possível registrar a ação: '+e.message);}
}
async function remover(i){
  try{if(window.CenterAccess?.user)await CenterAccess.track('material.list.remove',MODULO.id);lista.splice(i,1);refresh();}catch(e){alert('Não foi possível registrar a ação: '+e.message);}
}
function refresh(){
  document.getElementById('lista').innerHTML = lista.map((v,i) =>
    `<div><span><b>${esc(v.nome)}</b> — ${esc(v.cargo)}</span>
     <a onclick="remover(${i})">remover</a></div>`).join('');
}
function toggleGuias(){
  guias = !guias;
  document.querySelectorAll('#stage .peca').forEach(p=>p.classList.toggle('guias',guias));
}

function iniciar(mod){
  MODULO = mod;
  MODULO.campos.forEach(k => {
    const el = campoEl(k);
    if (el) el.addEventListener('input', preview);
  });
  if (MODULO.aoMontar) MODULO.aoMontar();
  refresh(); setImp('unit'); preview();
}
"""


# ------------------------------------------------------------------ HTML
def pagina(titulo, base, corpo, modulo_nome="", scripts=(), js="", js_antes="",
           descricao="", sessao=True):
    """Esqueleto de página. `base` é o caminho relativo até a raiz do site.

    Ordem dos scripts: bibliotecas → BASE e constantes da página → base.js →
    o código do módulo. Nada roda antes do que precisa existir."""
    with open(os.path.join(RAIZ, 'assets', 'identity.bundle.js'), 'rb') as auth_file:
        auth_version = hashlib.sha256(auth_file.read()).hexdigest()[:12]
    auth_scripts = (f'<script src="{base}assets/access.js"></script><script src="{base}assets/identity.bundle.js?v={auth_version}" defer></script>' if sessao else '')
    libs = "\n".join(f'<script src="{base}assets/vendor/{s}"></script>' for s in scripts)
    voltar = (f'<a class="voltar" href="{base}">← todos os módulos</a>' if base else "")
    sep = '<span class="sep"></span>' if modulo_nome else ""
    meta = (f'<meta name="description" content="{descricao}">\n' if descricao else "")
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{titulo}</title>
{meta}<link rel="stylesheet" href="{base}assets/base.css">
<link rel="icon" href="{base}assets/marca/simbolo-cor.png">
</head>
<body>
{auth_scripts}
<header>
  <a href="{base or '#'}"><img class="logo" src="{base}assets/marca/assinatura-reduzida-neg.png"
     alt="Center Ônibus"></a>
  {sep}<span class="mod">{modulo_nome}</span>
  {voltar}
  <span id="session-name" style="font-size:11px;margin-left:auto"></span>
  <button id="session-logout" type="button" style="width:auto;padding:6px 10px" {'hidden' if 'login' in titulo.lower() or titulo.startswith('Entrar') else ''}>Sair</button>
</header>
{corpo}
{libs}
<script>const BASE={base!r};
{js_antes}</script>
<script src="{base}assets/base.js"></script>
<script>{js}</script>
</body>
</html>
"""


def escrever(rel, texto):
    destino = f"{RAIZ}/{rel}"
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    open(destino, "w", encoding="utf-8").write(texto)
    return len(texto.encode())
