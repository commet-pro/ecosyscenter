const el=id=>document.getElementById(id);
async function run(action){
 const buttons=[...document.querySelectorAll('main button')];buttons.forEach(b=>b.disabled=true);
 try{await action();}catch(e){el('meli-status').textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}
}

async function loadMarketplace(){
 const c=await CenterAccess.request('mercadolivre/status');
 el('meli-status').textContent=(c.connected?'Conta conectada. ':c.configured?'Aplicativo configurado. ':'Aplicativo ainda não configurado. ')+(c.message||'')+(c.updatedAt?' Última atualização: '+new Date(c.updatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'. '+c.count+' produtos.':'');
 el('meli-callback').textContent=c.callback;
 el('meli-client').value=c.clientId||'';el('meli-seller').value=c.sellerId||'';
}
el('meli-save').onclick=()=>run(async()=>{
 await CenterAccess.request('mercadolivre/config',{method:'POST',body:JSON.stringify({clientId:el('meli-client').value.trim(),clientSecret:el('meli-secret').value.trim(),sellerId:el('meli-seller').value.trim()})});
 el('meli-secret').value='';await loadMarketplace();
});
el('meli-connect').onclick=()=>run(async()=>{const result=await CenterAccess.request('mercadolivre/connect',{method:'POST'});window.location.assign(result.url);});
el('meli-refresh').onclick=()=>run(loadMarketplace);
CenterAccess.ready.then(async me=>{if(!me)return;const allowed=me.roles.includes('admin');el('market-access').textContent=allowed?'Conectado como '+(me.name||me.email||me.id):'A configuração do catálogo está disponível apenas para administradores.';if(allowed)try{await loadMarketplace();}catch(e){el('meli-status').textContent=e.message;}});
