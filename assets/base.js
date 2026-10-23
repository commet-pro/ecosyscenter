const NAVY="#122B4A", STEEL="#2E6DA4", RED="#C8102E", WHITE="#F4F4F4", GREY="#E4E7EB";
const CAP_ARCH=0.686, CAP_INTER=0.728;
const SIMB_RATIO=1.512605, SIMB_MIN=8.0;
const ASSIN_RATIO=4.684647, ASSIN_MIN=20.0;
const ESTADOS="SÃO PAULO · BAHIA · RIO DE JANEIRO", SITE="www.centeronibus.com.br", TEL_GERAL="(11) 2967-3002";
const CHAVE_PUBLICA="3wl9XPhQhpsfGkBQan0wfHKDCknCGqxFeKiQJ5jw0mc";
const URL_VALIDADOR="" || new URL(BASE+"v/",location.href).href;
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
