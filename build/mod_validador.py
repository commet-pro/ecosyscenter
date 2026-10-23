#!/usr/bin/env python3
"""Módulo Validador — confere a assinatura do QR do crachá.

Só tem a chave pública: consegue verificar, não consegue emitir. A conferência
é matemática e local — não consulta servidor e funciona no modo avião.
"""
import core as C

JS = r"""
const VAL = {
  stream:null,

  async camera(){
    this.parar();
    const w=document.getElementById('camwrap'), v=document.getElementById('vid');
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      this.stream=s;w.style.display='block'; v.srcObject=s; await v.play();
      this.loop();
    }catch(e){
      this.parar();
      document.getElementById('res').innerHTML =
        `<div class="fixo">Não consegui abrir a câmera (${esc(e.name)}).
         Use <b>Colar código</b>.</div>`;
    }
  },

  loop(){
    if(!this.stream)return;
    const v=document.getElementById('vid'), c=document.getElementById('cnv');
    if(!v||!v.videoWidth) return requestAnimationFrame(()=>this.loop());
    c.width=v.videoWidth; c.height=v.videoHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(v,0,0,c.width,c.height);
    const img=ctx.getImageData(0,0,c.width,c.height);
    const r=jsQR(img.data,img.width,img.height);
    if(r&&r.data){ this.parar(); this.verificar(r.data); return; }
    requestAnimationFrame(()=>this.loop());
  },

  parar(){
    if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; }
    const w=document.getElementById('camwrap'); if(w) w.style.display='none';
  },

  colar(){
    const t=prompt('Cole aqui o conteúdo do QR:');
    if(t) this.verificar(t);
  },

  verificar(txt){
    const res=document.getElementById('res');
    const cru=(txt||'').trim();
    const i=cru.indexOf('CO1.');
    if(i<0) return res.innerHTML=this.cartao(false,'Código não reconhecido',
      '<p class="meta">Isso não é um QR de crachá da Center Ônibus.</p>');
    const p=cru.slice(i).split('.');
    if(p.length!==3) return res.innerHTML=this.cartao(false,'Código malformado','');
    let ok=false, campos=[];
    try{
      const carga=b64uBytes(p[1]);
      ok=nacl.sign.detached.verify(carga, b64uBytes(p[2]), b64uBytes(CHAVE_PUBLICA));
      campos=new TextDecoder().decode(carga).split('|');
    }catch(e){ ok=false; }

    if(!ok) return res.innerHTML=this.cartao(false,'Crachá não autêntico',
      `<p class="meta">Este código não foi emitido pela Center Ônibus, ou os dados
       foram alterados depois da emissão.</p>`);

    const [nome,cargo,val]=campos;
    let vencido=false;
    const m=/^(\d{2})\/(\d{4})$/.exec(val||'');
    if((campos.length!==3 && !(campos.length===4 && /^ID=[A-Za-z0-9_-]{16}$/.test(campos[3]))) || !nome || !cargo || !m || +m[1]<1 || +m[1]>12) return res.innerHTML=this.cartao(false,'Dados do crachá inválidos','');
    vencido = new Date() >= new Date(+m[2], +m[1], 1);
    res.innerHTML=this.cartao(!vencido, vencido?'Crachá vencido':'Crachá autêntico',
      `<div class="nome">${esc(nome)}</div>
       <div class="cargo">${esc(cargo)}</div>
       <p class="meta">Crachá válido até ${esc(val)}<br>
     ${campos[3]?'Referência da emissão: '+esc(campos[3].slice(3))+'<br>':''}
       ${vencido ? 'A validade expirou — confirme com a Center Ônibus antes de liberar o acesso.'
                 : 'Assinatura conferida nesta página, sem consultar servidor.'}</p>`);
  },

  cartao(ok,titulo,corpo){
    const cor = ok?'#1f7a4d':RED;
    return `<div class="cx" style="border-color:${cor}">
      <div class="tit" style="color:${cor}">${ok?'&#10003;':'&#10007;'} ${esc(titulo)}</div>
      ${corpo||''}</div>`;
  }
};
window.addEventListener('pagehide',()=>VAL.parar());
"""


def tela(base):
    return f"""
<div class="livre">
  <div class="panel">
    <h2>Validar crachá</h2>
    <p class="hint" style="margin:0 0 14px">Aponte a câmera para o QR do verso
    ou cole o conteúdo lido por outro leitor. A conferência é feita aqui mesmo —
    esta página só tem a chave pública, então valida mas não emite.</p>
    <div class="row" style="margin-top:0">
      <button onclick="VAL.camera()">Ligar câmera</button>
      <button class="ghost" onclick="VAL.colar()">Colar código</button>
    </div>
    <div id="camwrap" style="display:none;margin-top:14px">
      <video id="vid" playsinline muted></video>
      <canvas id="cnv" style="display:none"></canvas>
    </div>
    <div class="res" id="res"></div>
  </div>
</div>"""


def build():
    n = C.escrever("marketing/validador/index.html", C.pagina(
        "Validador de crachá — Ecossistema Center Ônibus", "../../", tela("../../"),
        modulo_nome="Validador de crachá",
        scripts=["nacl-fast.min.js", "jsQR.js"], js=JS,
        descricao="Confere pela câmera se um crachá Center Ônibus é autêntico."))
    print(f"  marketing/validador/index.html  {n//1024:>4} KB")
