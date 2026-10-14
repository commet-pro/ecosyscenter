import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { authorize, badge, signingKey, token, location, hash } from './security.mjs';
import { generate } from './ai.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=resolve(process.env.DATA_DIR||resolve(root,'.data')); mkdirSync(dir,{recursive:true,mode:0o700});
const db=new DatabaseSync(resolve(dir,'center.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, at TEXT, actor TEXT, action TEXT, ip TEXT, detail TEXT); CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, value TEXT); CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY, at TEXT, status TEXT, article TEXT); CREATE TABLE IF NOT EXISTS runs(day TEXT PRIMARY KEY, status TEXT);`);
const operators=JSON.parse(process.env.OPERATORS_JSON||'[]');
const origin=process.env.PUBLIC_ORIGIN||'http://localhost:8000';
if(new URL(origin).origin!==origin) throw Error('PUBLIC_ORIGIN deve conter apenas protocolo e domínio, sem barra final.');
const master=Buffer.from(process.env.SETTINGS_KEY||'','base64');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function seal(c) { if(master.length!==32) throw Error('Configure SETTINGS_KEY no servidor.'); const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',master,iv); return JSON.stringify({iv:iv.toString('base64'),data:Buffer.concat([cipher.update(JSON.stringify(c)),cipher.final()]).toString('base64'),tag:cipher.getAuthTag().toString('base64')}); }
function config() { const row=db.prepare('SELECT value FROM settings WHERE id=1').get(); if(!row)return null; const v=JSON.parse(row.value),dec=createDecipheriv('aes-256-gcm',master,Buffer.from(v.iv,'base64')); dec.setAuthTag(Buffer.from(v.tag,'base64')); return JSON.parse(Buffer.concat([dec.update(Buffer.from(v.data,'base64')),dec.final()]).toString()); }
function audit(actor,action,ip,detail={}) { db.prepare('INSERT INTO audit(at,actor,action,ip,detail) VALUES(?,?,?,?,?)').run(new Date().toISOString(),actor,action,ip,JSON.stringify(detail)); }
function send(res,status,data,type='application/json') {res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'geolocation=(self), camera=(self)'});res.end(type==='application/json'?JSON.stringify(data):data);}
async function body(req) {let s=''; for await(const part of req){s+=part;if(Buffer.byteLength(s)>32768)throw Error('Pedido muito grande.');}return JSON.parse(s||'{}');}
let busy=false;
async function createPost(c,topic,actor,ip) {
  if(busy)throw Error('Já há uma pesquisa em andamento.'); busy=true;
  try { const previous=db.prepare('SELECT article FROM posts ORDER BY at DESC LIMIT 30').all().map(p=>JSON.parse(p.article).title);
    const article=await generate(c,topic+'\nEvite repetir os títulos e enfoques já produzidos: '+JSON.stringify(previous));
    if(previous.some(t=>t.trim().toLocaleLowerCase('pt-BR')===article.title.trim().toLocaleLowerCase('pt-BR')))throw Error('Tema repetido: o artigo não foi salvo. Ajuste a direção editorial.');
    const id=randomUUID(),status=c.autoPublish&&!article.technicalClaims?'published':'draft';
    db.prepare('INSERT INTO posts VALUES(?,?,?,?)').run(id,new Date().toISOString(),status,JSON.stringify(article)); audit(actor,'ai.generate',ip,{id,status}); return {id,status,article};
  } finally {busy=false;}
}
const rates=new Map();
function limited(ip) {const now=Date.now(),r=rates.get(ip)||{at:now,n:0};if(now-r.at>60000){r.at=now;r.n=0;}r.n++;rates.set(ip,r);return r.n>60;}
setInterval(()=>{for(const [ip,r]of rates)if(Date.now()-r.at>60000)rates.delete(ip);},60000).unref();
function page(title,description,content,path) {return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)} | Center Ônibus</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(origin+path)}"><link rel="stylesheet" href="/assets/base.css"><body><article class="portal"><a href="/blog/">Center Ônibus · Conteúdo</a>${content}</article></body></html>`;}
const server=http.createServer(async(req,res)=>{
  let actor='anonymous',ip=req.socket.remoteAddress;
  // Only trust this single header when an explicitly configured edge proxy overwrites it.
  if(process.env.TRUST_PROXY==='true')ip=String(req.headers['x-real-ip']||ip).slice(0,100);
  try {
    const path=new URL(req.url,'http://local').pathname;
    if(path.startsWith('/api/')) {
      if(limited(ip))return send(res,429,{error:'Aguarde um minuto antes de tentar novamente.'});
      const user=authorize(req.headers.authorization,operators);
      if(!user){audit(actor,'access.denied',ip,{path});return send(res,401,{error:'Acesso individual inválido ou revogado.'});}actor=user.id;
      if(req.headers.origin&&req.headers.origin!==origin)return send(res,403,{error:'Origem não autorizada.'});
      const allowed=role=>user.roles?.includes(role)||user.roles?.includes('admin');
      const requireRole=role=>{if(!allowed(role))throw Object.assign(Error('Você não tem autorização para este módulo.'),{status:403});};
      if(req.method==='GET'&&path==='/api/me'){audit(actor,'access.connected',ip);return send(res,200,{id:user.id,roles:user.roles});}
      if(req.method==='GET'&&path==='/api/audit'){requireRole('admin');return send(res,200,db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all());}
      if(req.method==='POST'&&path==='/api/badges/sign') {
        requireRole('issuer');const v=await body(req),geo=location(v.location),payload=badge(v);
        const key=signingKey(process.env.BADGE_SECRET_B64,JSON.parse(readFileSync(resolve(root,'build/chave-publica.json'),'utf8')).pub_b64);
        const signed=token(payload,key);
        audit(actor,'badge.sign',ip,{location:geo,payloadHash:hash(payload),userAgent:String(req.headers['user-agent']||'').slice(0,300)});
        return send(res,200,{token:signed});
      }
      if(path==='/api/ai/config') {
        requireRole('admin');const old=config();
        if(req.method==='GET')return send(res,200,old?{...old,key:undefined,connected:true}:{connected:false});
        if(req.method==='POST') {
          const v=await body(req);
          if(!['openai','google'].includes(v.provider)||! /^[a-zA-Z0-9._-]{1,100}$/.test(v.model||'')||typeof v.topic!=='string'||!v.topic.trim()||v.topic.length>500||!Number.isInteger(v.hour)||v.hour<0||v.hour>23||typeof v.enabled!=='boolean'||typeof v.autoPublish!=='boolean')throw Error('Configuração inválida.');
          const key=v.key||(old?.provider===v.provider?old.key:'');if(typeof key!=='string'||key.length<10||key.length>500)throw Error('Informe a chave de API do provedor.');
          db.prepare('INSERT OR REPLACE INTO settings VALUES(1,?)').run(seal({provider:v.provider,model:v.model,topic:v.topic,hour:v.hour,enabled:v.enabled,autoPublish:v.autoPublish,key}));audit(actor,'ai.configure',ip);return send(res,200,{ok:true});
        }
      }
      if(path==='/api/ai/generate'&&req.method==='POST'){requireRole('editor');const c=config();if(!c)throw Error('Conecte o provedor primeiro.');return send(res,200,await createPost(c,c.topic,actor,ip));}
      if(path==='/api/posts'&&req.method==='GET'){requireRole('editor');return send(res,200,db.prepare('SELECT * FROM posts ORDER BY at DESC LIMIT 100').all().map(p=>({...p,article:JSON.parse(p.article)})));}
      if(path==='/api/posts/publish'&&req.method==='POST'){requireRole('editor');const v=await body(req);const changed=db.prepare("UPDATE posts SET status='published' WHERE id=?").run(String(v.id));if(!changed.changes)throw Error('Artigo não encontrado.');audit(actor,'post.publish',ip,{id:v.id});return send(res,200,{ok:true});}
      return send(res,404,{error:'Rota não encontrada.'});
    }
    if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Método não permitido.'});
    if(path==='/blog/'||path==='/blog') {
      const posts=db.prepare("SELECT * FROM posts WHERE status='published' ORDER BY at DESC").all();
      return send(res,200,page('Peças de carroceria e manutenção','Guias e informações da Center Ônibus.',`<h1>Guias da Center Ônibus</h1>${posts.map(p=>{const a=JSON.parse(p.article);return `<section><h2><a href="/blog/${p.id}/">${esc(a.title)}</a></h2><p>${esc(a.description)}</p></section>`;}).join('')}`,'/blog/'),'text/html');
    }
    const match=/^\/blog\/([a-f0-9-]+)\/$/.exec(path);
    if(match) {
      const p=db.prepare("SELECT * FROM posts WHERE id=? AND status='published'").get(match[1]);if(!p)return send(res,404,'Artigo não encontrado.','text/plain');const a=JSON.parse(p.article);
      const json=JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:a.title,description:a.description,datePublished:p.at,author:{'@type':'Organization',name:'Center Ônibus'},mainEntityOfPage:origin+path}).replace(/</g,'\\u003c');
      return send(res,200,page(a.title,a.description,`<h1>${esc(a.title)}</h1><time>${esc(new Date(p.at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</time>${a.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}<h2>Fontes da pesquisa</h2><ul>${a.sources.map(s=>`<li><a rel="noopener noreferrer" href="${esc(s.url)}">${esc(s.title||s.url)}</a></li>`).join('')}</ul><script type="application/ld+json">${json}</script>`,path),'text/html');
    }
    if(path==='/sitemap.xml'){const rows=db.prepare("SELECT id,at FROM posts WHERE status='published'").all();return send(res,200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(origin)}/blog/</loc></url>${rows.map(p=>`<url><loc>${esc(origin)}/blog/${p.id}/</loc><lastmod>${p.at}</lastmod></url>`).join('')}</urlset>`,'application/xml');}
    if(path==='/robots.txt')return send(res,200,`User-agent: *\nDisallow: /api/\nDisallow: /marketing/\nSitemap: ${origin}/sitemap.xml\n`,'text/plain');
    if(!(/^\/(?:assets|marketing|v)\//.test(path)||path==='/'||path==='/index.html')||path.includes('..')||path.includes('%')||path.includes('\\'))return send(res,404,'Não encontrado.','text/plain');
    let rel=path==='/'?'index.html':path.slice(1);if(rel.endsWith('/'))rel+='index.html';
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg'};
    if(!types[extname(rel)])return send(res,404,'Não encontrado.','text/plain');
    try{return send(res,200,readFileSync(resolve(root,rel)),types[extname(rel)]);}catch{return send(res,404,'Não encontrado.','text/plain');}
  }catch(e){audit(actor,'request.failed',ip,{error:e.message});send(res,e.status||400,{error:e.message});}
});
// One instance on persistent storage. One claim/day prevents duplicate spend after restarts.
const timer=setInterval(async()=>{
  try{const c=config();if(!c?.enabled||busy)return;const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));if(+parts.hour<c.hour)return;
    const day=`${parts.year}-${parts.month}-${parts.day}`;if(!db.prepare("INSERT OR IGNORE INTO runs VALUES(?,'running')").run(day).changes)return;
    try{await createPost(c,c.topic,'scheduler','server');db.prepare("UPDATE runs SET status='done' WHERE day=?").run(day);}catch(e){db.prepare("UPDATE runs SET status='failed' WHERE day=?").run(day);audit('scheduler','ai.failed','server',{error:e.message});}
  }catch(e){console.error('Não foi possível executar a agenda:',e.message);}
},60000);timer.unref();
server.listen(Number(process.env.PORT||8000),process.env.HOST||'127.0.0.1',()=>console.log(`Center em ${origin} PORT=${server.address().port}`));
