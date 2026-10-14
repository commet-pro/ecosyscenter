import {randomUUID,randomBytes,createCipheriv,createDecipheriv,createHmac,timingSafeEqual} from 'node:crypto';
import {authorize,badge,signingKey,token,location,hash} from './security.mjs';
import {generate} from './ai.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cloudApp({store,env,publicKey,request=fetch,generateArticle=generate,now=()=>new Date()}) {
  const origin=env.PUBLIC_ORIGIN||env.URL;
  const master=()=>{const k=Buffer.from(env.SETTINGS_KEY||'','base64');if(k.length!==32)throw Error('Configuração privada do servidor incompleta.');return k;};
  const read=key=>store.get(key,{type:'json'});
  const write=(key,v,opts)=>store.setJSON(key,v,opts);
  const response=(status,data,type='application/json')=>new Response(type==='application/json'?JSON.stringify(data):data,{status,headers:{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
  async function audit(actor,action,ip,detail={}){const at=now().toISOString();await write(`audit/${at}/${randomUUID()}`,{at,actor,action,ip,detail:JSON.stringify(detail)});}
  async function entries(prefix,limit=100){const {blobs}=await store.list({prefix});return (await Promise.all(blobs.map(b=>b.key).sort().reverse().slice(0,limit).map(read))).filter(Boolean);}
  function seal(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',master(),iv);return {iv:iv.toString('base64'),data:Buffer.concat([c.update(JSON.stringify(value)),c.final()]).toString('base64'),tag:c.getAuthTag().toString('base64')};}
  async function settings(){const v=await read('settings');if(!v)return null;const d=createDecipheriv('aes-256-gcm',master(),Buffer.from(v.iv,'base64'));d.setAuthTag(Buffer.from(v.tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(v.data,'base64')),d.final()]).toString());}
  const signature=id=>createHmac('sha256',master()).update(id).digest('hex');
  async function queue(actor,ip,claim) {
    const c=await settings();if(!c)throw Error('Conecte o provedor de IA primeiro.');
    const id=randomUUID(),at=now().toISOString();
    if(claim&&!(await write('claims/'+claim,{id,at},{onlyIfNew:true})).modified)throw Error('Já existe uma execução neste intervalo. Consulte os artigos e tente novamente depois.');
    await write('jobs/'+id,{id,actor,ip,at,status:'queued'});
    try {const r=await request(origin+'/.netlify/functions/center-ai-background',{method:'POST',headers:{'Content-Type':'application/json','X-Center-Job':signature(id)},body:JSON.stringify({id}),signal:AbortSignal.timeout(15000)});if(r.status!==202)throw Error('Não foi possível iniciar a pesquisa em segundo plano.');}
    catch(e){await write('jobs/'+id,{id,actor,at,status:'failed',error:e.message});throw e;}
    await audit(actor,'ai.queued',ip,{id});return {jobId:id,status:'queued'};
  }
  async function worker(req){
    let id;
    try{id=(await req.json()).id;if(!/^[a-f0-9-]{36}$/.test(id||''))return;const supplied=req.headers.get('X-Center-Job')||'',expected=signature(id);if(supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return;
      const job=await read('jobs/'+id);if(!job||job.status!=='queued')return;
      if(!(await write('started/'+id,{at:now().toISOString()},{onlyIfNew:true})).modified)return;
      await write('jobs/'+id,{...job,status:'running'});
      try {
        const c=await settings();if(!c)throw Error('Provedor não configurado.');
        const previous=(await entries('posts/',100)).map(p=>p.article.title);
        const article=await generateArticle(c,c.topic+'\nEvite repetir estes títulos e enfoques: '+JSON.stringify(previous));
        const titleKey=hash(article.title.trim().toLocaleLowerCase('pt-BR'));
        if(!(await write('titles/'+titleKey,{id},{onlyIfNew:true})).modified)throw Error('Título já produzido. Ajuste a direção editorial.');
        const status=c.autoPublish&&!article.technicalClaims?'published':'draft';
        await write('posts/'+job.at+'/'+id,{id,at:job.at,status,article});
        await audit(job.actor,'ai.generate',job.ip,{id,status});await write('jobs/'+id,{...job,status:'done',postId:id});
      }catch(e){await write('jobs/'+id,{...job,status:'failed',error:e.message});await audit(job.actor,'ai.failed',job.ip,{id,error:e.message});}
    }catch{console.error('Falha ao processar trabalho de conteúdo.');}
  }
  async function scheduled(){if(env.CENTER_ENV!=='production')return;const c=await settings();if(!c?.enabled)return;
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now()).map(p=>[p.type,p.value]));
    if(+p.hour<c.hour)return;const day=`${p.year}-${p.month}-${p.day}`;
    try{await queue('scheduler','server','daily-'+day);}catch(e){if(!e.message.startsWith('Já existe'))await audit('scheduler','ai.schedule.failed','server',{error:e.message});}
  }
  async function api(req,context={}) {
    let actor='anonymous';const ip=context.ip||'unknown';
    try {
      const path=new URL(req.url).pathname.replace(/^\/\.netlify\/functions\/center-api/,'');
      const user=authorize(req.headers.get('Authorization'),JSON.parse(env.OPERATORS_JSON||'[]'));
      if(!user){await audit(actor,'access.denied',ip,{path});return response(401,{error:'Acesso individual inválido ou revogado.'});}actor=user.id;
      if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return response(403,{error:'Origem não autorizada.'});
      const role=r=>{if(!user.roles?.some(v=>v===r||v==='admin'))throw Object.assign(Error('Você não tem autorização para este módulo.'),{status:403});};
      const body=async()=>{const raw=await req.text();if(Buffer.byteLength(raw)>32768)throw Error('Pedido muito grande.');return JSON.parse(raw||'{}');};
      if(path==='/api/me'&&req.method==='GET'){await audit(actor,'access.connected',ip);return response(200,{id:user.id,roles:user.roles});}
      if(path==='/api/audit'&&req.method==='GET'){role('admin');return response(200,await entries('audit/',200));}
      if(path==='/api/badges/sign'&&req.method==='POST'){role('issuer');const v=await body(),geo=location(v.location),payload=badge(v,now()),key=signingKey(env.BADGE_SECRET_B64,publicKey);
        const signed=token(payload,key);await audit(actor,'badge.sign',ip,{location:geo,payloadHash:hash(payload),userAgent:(req.headers.get('User-Agent')||'').slice(0,300)});return response(200,{token:signed});}
      if(path==='/api/ai/config'){
        role('admin');const old=await settings();
        if(req.method==='GET')return response(200,old?{...old,key:undefined,connected:true}:{connected:false});
        if(req.method==='POST'){
          const v=await body();if(!['openai','google'].includes(v.provider)||! /^[a-zA-Z0-9._-]{1,100}$/.test(v.model||'')||typeof v.topic!=='string'||!v.topic.trim()||v.topic.length>500||!Number.isInteger(v.hour)||v.hour<0||v.hour>23||typeof v.enabled!=='boolean'||typeof v.autoPublish!=='boolean')throw Error('Configuração inválida.');
          const key=v.key||(old?.provider===v.provider?old.key:'');if(typeof key!=='string'||key.length<10||key.length>500)throw Error('Informe a chave de API do provedor.');
          await write('settings',seal({provider:v.provider,model:v.model,topic:v.topic,hour:v.hour,enabled:v.enabled,autoPublish:v.autoPublish,key}));await audit(actor,'ai.configure',ip);return response(200,{ok:true});
        }
      }
      if(path==='/api/ai/generate'&&req.method==='POST'){role('editor');return response(202,await queue(actor,ip,`manual-${hash(actor)}-${Math.floor(now().getTime()/60000)}`));}
      if(path.startsWith('/api/ai/jobs/')&&req.method==='GET'){role('editor');const id=path.split('/').at(-1);if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Trabalho inválido.');const job=await read('jobs/'+id);if(!job)return response(404,{error:'Pesquisa não encontrada.'});if(job.actor!==actor&&!user.roles.includes('admin'))return response(403,{error:'Sem acesso a esta pesquisa.'});
        if(['queued','running'].includes(job.status)&&now()-new Date(job.at)>15*60000)return response(200,{status:'failed',error:'Pesquisa excedeu o prazo. Consulte os artigos antes de tentar novamente.'});
        return response(200,{status:job.status,error:job.error,postId:job.postId});}
      if(path==='/api/posts'&&req.method==='GET'){role('editor');return response(200,await entries('posts/',100));}
      if(path==='/api/posts/publish'&&req.method==='POST'){role('editor');const v=await body(),list=await entries('posts/',100),post=list.find(p=>p.id===v.id);if(!post)throw Error('Artigo não encontrado.');await write('posts/'+post.at+'/'+post.id,{...post,status:'published'});await audit(actor,'post.publish',ip,{id:post.id});return response(200,{ok:true});}
      return response(404,{error:'Rota não encontrada.'});
    }catch(e){try{await audit(actor,'request.failed',ip,{error:e.message});}catch{}return response(e.status||400,{error:e.message});}
  }
  const page=(title,description,content,path)=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)} | Center Ônibus</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(origin+path)}"><link rel="stylesheet" href="/assets/base.css"><body><article class="portal"><a href="/blog/">Center Ônibus · Conteúdo</a>${content}</article></body></html>`;
  async function blog(req){const path=new URL(req.url).pathname,posts=(await entries('posts/',1000)).filter(p=>p.status==='published');
    if(path==='/robots.txt')return response(200,`User-agent: *\nDisallow: /api/\nDisallow: /marketing/\nSitemap: ${origin}/sitemap.xml\n`,'text/plain');
    if(path==='/sitemap.xml')return response(200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(origin)}/blog/</loc></url>${posts.map(p=>`<url><loc>${escape(origin)}/blog/${p.id}/</loc><lastmod>${p.at}</lastmod></url>`).join('')}</urlset>`,'application/xml');
    if(path==='/blog'||path==='/blog/')return response(200,page('Guias de peças de carroceria','Informações da Center Ônibus.',`<h1>Guias da Center Ônibus</h1>${posts.length?posts.map(p=>`<section><h2><a href="/blog/${p.id}/">${escape(p.article.title)}</a></h2><p>${escape(p.article.description)}</p></section>`).join(''):'<p>Os próximos artigos aparecerão aqui.</p>'}`,'/blog/'),'text/html');
    const id=/^\/blog\/([a-f0-9-]{36})\/?$/.exec(path)?.[1],p=posts.find(p=>p.id===id);if(!p)return response(404,'Artigo não encontrado.','text/plain');
    const a=p.article,json=JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:a.title,description:a.description,datePublished:p.at,author:{'@type':'Organization',name:'Center Ônibus'},mainEntityOfPage:origin+'/blog/'+id+'/'}).replace(/</g,'\\u003c');
    return response(200,page(a.title,a.description,`<h1>${escape(a.title)}</h1><time>${escape(new Date(p.at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</time>${a.paragraphs.map(t=>`<p>${escape(t)}</p>`).join('')}<h2>Fontes da pesquisa</h2><ul>${a.sources.map(s=>`<li><a rel="noopener noreferrer" href="${escape(s.url)}">${escape(s.title||s.url)}</a></li>`).join('')}</ul><script type="application/ld+json">${json}</script>`,'/blog/'+id+'/'),'text/html');
  }
  return {api,worker,scheduled,blog};
}
