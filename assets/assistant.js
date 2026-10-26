const el = id=>document.getElementById(id);
const status = text=>{el('ai-status').textContent=text;};
async function run(action) {
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try {await action();}catch(e){status(e.message);}finally{buttons.forEach(b=>b.disabled=false);}
}
async function loadPosts() {
  const posts=await CenterAccess.request('posts');const box=el('articles');box.replaceChildren();
  for(const p of posts){const section=document.createElement('section'),h=document.createElement('h2'),desc=document.createElement('p'),body=document.createElement('div');h.textContent=p.article.title;desc.textContent=p.status==='published'?'Publicado':'Rascunho · revisar antes de publicar';
    p.article.paragraphs.forEach(text=>{const para=document.createElement('p');para.textContent=text;body.append(para);});
    for(const source of p.article.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.title||source.url;a.target='_blank';a.rel='noopener noreferrer';body.append(a,document.createElement('br'));}
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Ler artigo e fontes';details.append(summary,body);section.append(h,desc,details);
    if(p.status==='draft'){const button=document.createElement('button');button.textContent='Revisado: publicar';button.onclick=()=>run(async()=>{await CenterAccess.request('posts/publish',{method:'POST',body:JSON.stringify({id:p.id})});await loadPosts();status('Artigo publicado.');});section.append(button);}
    else {const a=document.createElement('a');a.href='https://centerbus.netlify.app/blog/'+p.id+'/';a.target='_blank';a.rel='noopener noreferrer';a.textContent='Ver publicação';section.append(a);}
    box.append(section);
  }
}
el('load').onclick=()=>run(async()=>{const c=await CenterAccess.request('ai/config');if(c.connected){for(const id of ['provider','model','topic','hour'])el(id).value=c[id];el('enabled').checked=c.enabled;el('autoPublish').checked=c.autoPublish;}status(c.connected?'Configuração carregada.':'Conecte uma chave de API.');});
el('save').onclick=()=>run(async()=>{const c=Object.fromEntries(['provider','model','topic','key'].map(id=>[id,el(id).value.trim()]));c.hour=+el('hour').value;c.enabled=el('enabled').checked;c.autoPublish=el('autoPublish').checked;await CenterAccess.request('ai/config',{method:'POST',body:JSON.stringify(c)});el('key').value='';status('Configuração salva.');});
el('generate').onclick=()=>run(async()=>{
  status('Pesquisando fontes e escrevendo. Isso pode levar alguns minutos.');
  const result=await CenterAccess.request('ai/generate',{method:'POST'});
  if(result.jobId){
    let done=false;
    for(let i=0;i<60;i++){
      await new Promise(resolve=>setTimeout(resolve,4000));
      const job=await CenterAccess.request('ai/jobs/'+result.jobId);
      if(job.status==='failed')throw Error(job.error||'Não foi possível criar o artigo.');
      if(job.status==='done'){done=true;break;}
    }
    if(!done){status('A pesquisa continua em segundo plano. Atualize a lista daqui a alguns minutos.');return;}
  }
  await loadPosts();status('Artigo criado.');
});
el('refresh').onclick=()=>run(loadPosts);
el('audit').onclick=()=>run(async()=>{
  const ref=el('audit-reference').value.trim(),rows=await CenterAccess.request('audit'+(ref?'?issuanceId='+encodeURIComponent(ref):'')),out=el('audit-output');out.replaceChildren();
  const labels={'badge.sign':'QR de crachá gerado','material.print':'Impressão solicitada','material.list.add':'Material incluído na lista','material.list.remove':'Material removido da lista','email.export':'Exportação de e-mail solicitada','access.connected':'Acesso autenticado','access.denied':'Acesso recusado','request.failed':'Ação não concluída','ai.configure':'Configuração de IA alterada','ai.queued':'Pesquisa de IA iniciada','ai.generate':'Artigo criado','ai.failed':'Falha na pesquisa de IA','post.publish':'Artigo publicado'};
  const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:12px';
  const head=document.createElement('tr');for(const title of ['Data e hora (Brasília)','Pessoa','Ação','IP','Detalhes']){const th=document.createElement('th');th.textContent=title;th.style.cssText='text-align:left;padding:12px 8px;border-bottom:2px solid #122B4A';head.append(th);}table.append(head);
  for(const row of rows){let detail={};try{detail=JSON.parse(row.detail||'{}');}catch{}
    const reference=detail.issuanceId?'Emissão '+detail.issuanceId+' · ':'';
    const description=reference+(detail.location?`Localização: ${detail.location.latitude}, ${detail.location.longitude} (precisão aproximada: ${Math.round(detail.location.accuracy)} m)`:detail.error||[detail.module,detail.count!==undefined?'Quantidade: '+detail.count:''].filter(Boolean).join(' · '));
    const tr=document.createElement('tr');for(const text of [new Date(row.at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),row.actor==='anonymous'?'Não identificado':row.actor,labels[row.action]||row.action,row.ip,description]){const td=document.createElement('td');td.textContent=text;td.style.cssText='padding:12px 8px;border-bottom:1px solid #dfe4e9;vertical-align:top;overflow-wrap:anywhere';tr.append(td);}table.append(tr);
  }out.append(table);status((ref?(rows.length?'Emissão localizada.':'Nenhuma emissão encontrada com essa referência.'):'Últimos 200 registros.')+' Localização informada pelo navegador; não representa um trajeto ou prova de presença.');
});
CenterAccess.ready.then(async me=>{if(!me)return;status('Conectado como '+(me.name||me.email||me.id));try{if(me.roles.some(r=>r==='admin'||r==='editor'))await loadPosts();}catch(e){status(e.message);}});

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
CenterAccess.ready.then(async me=>{if(me?.roles.includes('admin'))try{await loadMarketplace();}catch(e){el('meli-status').textContent=e.message;}});
CenterAccess.ready.then(me=>{if(me?.roles.includes('admin')&&location.hash==='#mercado-livre')el('mercado-livre').scrollIntoView({block:'start'});});
