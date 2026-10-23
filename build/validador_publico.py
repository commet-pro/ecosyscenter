#!/usr/bin/env python3
"""A página pública do validador — é para onde o QR do crachá aponta.

Quem escaneia com a câmera do celular cai direto aqui e vê o resultado, sem
precisar conhecer o portal. Só tem a chave pública: valida, não emite.
"""
import core as C

JS = r"""
function cartao(ok,titulo,corpo){
  const cor = ok ? '#1f7a4d' : RED;
  return `<div class="cx" style="border-color:${cor}">
    <div class="tit" style="color:${cor}">${ok?'&#10003;':'&#10007;'} ${esc(titulo)}</div>
    ${corpo||''}</div>`;
}

function validar(){
  const res=document.getElementById('res');
  let cru;try{cru=decodeURIComponent(location.hash.slice(1) || location.search.slice(1) || '');}catch{return res.innerHTML=cartao(false,'Código malformado','');}
  const i=cru.indexOf('CO1.');
  if(i<0) return res.innerHTML=cartao(false,'Nada para validar',
    `<p class="meta">Abra esta página escaneando o QR do verso de um crachá
     Center Ônibus.</p>`);
  const p=cru.slice(i).split('.');
  if(p.length!==3) return res.innerHTML=cartao(false,'Código malformado','');
  let ok=false, campos=[];
  try{
    const carga=b64uBytes(p[1]);
    ok=nacl.sign.detached.verify(carga, b64uBytes(p[2]), b64uBytes(CHAVE_PUBLICA));
    campos=new TextDecoder().decode(carga).split('|');
  }catch(e){ ok=false; }
  if(!ok) return res.innerHTML=cartao(false,'Crachá não autêntico',
    `<p class="meta">Este código não foi emitido pela Center Ônibus, ou os dados
     foram alterados depois da emissão.</p>`);

  const [nome,cargo,val]=campos;
  let vencido=false;
  const m=/^(\d{2})\/(\d{4})$/.exec(val||'');
  if((campos.length!==3 && !(campos.length===4 && /^ID=[A-Za-z0-9_-]{16}$/.test(campos[3]))) || !nome || !cargo || !m || +m[1]<1 || +m[1]>12) return res.innerHTML=cartao(false,'Dados do crachá inválidos','');
    vencido = new Date() >= new Date(+m[2], +m[1], 1);
  res.innerHTML=cartao(!vencido, vencido?'Crachá vencido':'Crachá autêntico',
    `<div class="nome">${esc(nome)}</div>
     <div class="cargo">${esc(cargo)}</div>
     <p class="meta">Crachá válido até ${esc(val)}<br>
     ${campos[3]?'Referência da emissão: '+esc(campos[3].slice(3))+'<br>':''}
     ${vencido ? 'A validade expirou — confirme com a Center Ônibus antes de liberar o acesso.'
               : 'Assinatura conferida nesta página, sem consultar servidor.'}</p>`);
}
validar();
window.addEventListener('hashchange', validar);
"""

ESTILO = """
<style>
body{background:var(--navy);min-height:100vh;display:flex;align-items:center;
  justify-content:center;padding:22px}
header{display:none}
.cx{background:#fff;max-width:420px;width:100%}
.marca{max-width:420px;width:100%;margin:0 auto}
.marca img{height:26px;width:auto;display:block;margin:0 0 18px}
.faixa{height:4px;display:flex;max-width:420px;width:100%}
.faixa i{display:block;height:100%}
.env{max-width:420px;width:100%}
</style>"""


def build():
    corpo = f"""{ESTILO}
<div class="env">
  <div class="marca"><img src="../assets/marca/assinatura-reduzida-neg.png"
    alt="Center Ônibus"></div>
  <div id="res"></div>
  <div class="faixa">
    <i style="width:56%;background:{C.NAVY}"></i>
    <i style="width:16%;background:{C.RED}"></i>
    <i style="width:28%;background:{C.STEEL}"></i>
  </div>
</div>"""
    n = C.escrever("v/index.html", C.pagina(
        "Center Ônibus — Validação de crachá", "../", corpo,
        scripts=["nacl-fast.min.js"], js=JS, sessao=False,
        descricao="Validação pública de crachá Center Ônibus."))
    print(f"  v/index.html                    {n//1024:>4} KB  ·  destino do QR")
