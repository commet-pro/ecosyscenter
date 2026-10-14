const el = id=>document.getElementById(id);
const status = text=>{el('ai-status').textContent=text;};
async function run(action) {
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try {if(el('access').value.trim())CenterAccess.credential=el('access').value.trim();el('access').value='';await action();}catch(e){status(e.message);}finally{buttons.forEach(b=>b.disabled=false);}
}
async function loadPosts() {
  const posts=await CenterAccess.request('posts');const box=el('articles');box.replaceChildren();
  for(const p of posts){const section=document.createElement('section'),h=document.createElement('h2'),desc=document.createElement('p'),body=document.createElement('div');h.textContent=p.article.title;desc.textContent=p.status==='published'?'Publicado':'Rascunho · revisar antes de publicar';
    p.article.paragraphs.forEach(text=>{const para=document.createElement('p');para.textContent=text;body.append(para);});
    for(const source of p.article.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.title||source.url;a.target='_blank';a.rel='noopener noreferrer';body.append(a,document.createElement('br'));}
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Ler artigo e fontes';details.append(summary,body);section.append(h,desc,details);
    if(p.status==='draft'){const button=document.createElement('button');button.textContent='Revisado: publicar';button.onclick=()=>run(async()=>{await CenterAccess.request('posts/publish',{method:'POST',body:JSON.stringify({id:p.id})});await loadPosts();status('Artigo publicado.');});section.append(button);}
    else {const a=document.createElement('a');a.href='/blog/'+p.id+'/';a.textContent='Ver publicação';section.append(a);}
    box.append(section);
  }
}
el('connect').onclick=()=>run(async()=>{const me=await CenterAccess.request('me');el('access').value='';status('Conectado como '+me.id);await loadPosts();});
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
el('audit').onclick=()=>run(async()=>{const rows=await CenterAccess.request('audit');el('audit-output').textContent=rows.map(r=>`${new Date(r.at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · ${r.actor} · ${r.action} · IP ${r.ip}\n${r.detail}`).join('\n\n');status('Últimos 200 registros · horário de Brasília.');});
el('logout').onclick=()=>{CenterAccess.credential='';el('access').value='';el('key').value='';el('articles').replaceChildren();el('audit-output').textContent='';status('Acesso encerrado.');};
