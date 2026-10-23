import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,verify} from 'node:crypto';
import {cloudApp} from '../server/cloud.mjs';
import {hash} from '../server/security.mjs';
function fixture(){
 const data=new Map(),store={async get(key){return data.get(key)?structuredClone(data.get(key)):null;},async setJSON(key,value,opts={}){if(opts.onlyIfNew&&data.has(key))return {modified:false};data.set(key,structuredClone(value));return {modified:true};},async list({prefix}){return {blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}};
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),pub=publicKey.export({type:'spki',format:'der'}).subarray(-32),seed=privateKey.export({type:'pkcs8',format:'der'}).subarray(-32);
 const env={PUBLIC_ORIGIN:'https://center.example',CENTER_ENV:'production',SETTINGS_KEY:randomBytes(32).toString('base64'),BADGE_SECRET_B64:Buffer.concat([seed,pub]).toString('base64url'),OPERATORS_JSON:JSON.stringify([{id:'rafa',sha256:hash('admin-credential'),roles:['admin']},{id:'rh',sha256:hash('issuer-credential'),roles:['issuer']}])};
 let calls=0;const queued=[];const app=cloudApp({store,env,publicKey:pub.toString('base64url'),now:()=>new Date('2026-10-14T15:00:00Z'),request:async(url,options)=>{queued.push(new Request(url,options));return {status:202};},generateArticle:async()=>{calls++;return {title:'<script>Guia Center</script>',description:'Guia seguro',paragraphs:['<img src=x onerror=alert(1)>'],sources:[{title:'Manual',url:'https://example.com/manual'}],technicalClaims:true};}});
 const api=(path,body,credential='admin-credential',headers={})=>app.api(new Request(env.PUBLIC_ORIGIN+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),{ip:'203.0.113.20'});
 return {data,store,app,api,env,queued,publicKey,calls:()=>calls};
}
const settings={provider:'openai',model:'test',key:'fake-api-key-for-tests',topic:'Guias de carroceria',hour:9,enabled:false,autoPublish:true};
test('Netlify: autorização, localização, IP da plataforma e persistência de auditoria',async()=>{
 const f=fixture();assert.equal((await f.api('me',undefined,'wrong')).status,401);
 assert.equal((await f.api('audit',undefined,'issuer-credential')).status,403);
 const v={nome:'Teste',cargo:'Vendas',validade:'12/2099'};
 assert.equal((await f.api('badges/sign',v)).status,400);
 const result=await(await f.api('badges/sign',{...v,location:{latitude:0,longitude:0,accuracy:10}},'issuer-credential',{'X-Real-IP':'spoofed'})).json();
 const parts=result.token.split('.');assert.ok(verify(null,Buffer.from(parts[1],'base64url'),f.publicKey,Buffer.from(parts[2],'base64url')));
 const logs=await(await f.api('audit')).json();assert.equal(logs.find(r=>r.action==='badge.sign').ip,'203.0.113.20');
 assert.equal((await f.api('me',undefined,'admin-credential',{Origin:'https://attacker.example'})).status,403);
});
test('Netlify: chave criptografada, trabalho autenticado executado uma vez e publicação revisada',async()=>{
 const f=fixture();assert.equal((await f.api('ai/config',settings)).status,200);
 assert.ok(!JSON.stringify(f.data.get('settings')).includes(settings.key));assert.equal((await(await f.api('ai/config')).json()).key,undefined);
 const job=await(await f.api('ai/generate',{})).json();assert.ok(job.jobId);assert.equal(f.queued.length,1);
 await f.app.worker(new Request('https://center.example/worker',{method:'POST',body:JSON.stringify({id:job.jobId})}));assert.equal(f.calls(),0);
 const request=f.queued[0];await Promise.all([f.app.worker(request.clone()),f.app.worker(request.clone())]);assert.equal(f.calls(),1);
 assert.equal((await(await f.api('ai/jobs/'+job.jobId)).json()).status,'done');
 const posts=await(await f.api('posts')).json();assert.equal(posts.length,1);assert.equal(posts[0].status,'draft');
 assert.equal((await f.app.blog(new Request('https://center.example/blog/'+posts[0].id+'/'))).status,404);
 assert.equal((await f.api('posts/publish',{id:posts[0].id})).status,200);
 const html=await(await f.app.blog(new Request('https://center.example/blog/'+posts[0].id+'/'))).text();assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<img src=x'));assert.match(html,/application\/ld\+json/);
 assert.equal((await f.api('ai/generate',{})).status,400);
});
test('Netlify: agendamento diário sem duplicação',async()=>{
 const f=fixture();await f.api('ai/config',{...settings,enabled:true});await Promise.all([f.app.scheduled(),f.app.scheduled()]);assert.equal(f.queued.length,1);
 await f.app.scheduled();assert.equal(f.queued.length,1);
});
test('Netlify: registra material e rejeita nomes de eventos arbitrários',async()=>{
 const f=fixture();assert.equal((await f.api('events',{action:'material.print',module:'cracha',count:2},'issuer-credential')).status,200);
 assert.equal((await f.api('events',{action:'fake.success',module:'cracha',count:2})).status,400);
 const logs=await(await f.api('audit')).json(),print=logs.find(l=>l.action==='material.print');assert.equal(print.actor,'rh');assert.equal(print.ip,'203.0.113.20');assert.equal(JSON.parse(print.detail).count,2);
});
test('cada emissão tem referência única e rastreável mesmo com os mesmos dados',async()=>{
 const f=fixture(),data={nome:'Pessoa teste',cargo:'Vendas',validade:'12/2099',location:{latitude:0,longitude:0,accuracy:10}};
 const first=await(await f.api('badges/sign',data,'issuer-credential')).json();
 const second=await(await f.api('badges/sign',data,'issuer-credential')).json();assert.notEqual(first.token,second.token);
 const signed=Buffer.from(first.token.split('.')[1],'base64url').toString();const id=signed.split('|')[3];assert.match(id,/^ID=[A-Za-z0-9_-]{16}$/);
 const audit=await(await f.api('audit')).json();const row=audit.find(r=>JSON.parse(r.detail).issuanceId===id.slice(3));assert.equal(row.actor,'rh');assert.equal(JSON.parse(row.detail).payloadHash,hash(signed));
 const found=await(await f.api('audit?issuanceId='+id.slice(3))).json();assert.equal(found.length,1);assert.equal(found[0].actor,'rh');
 assert.equal((await f.api('audit?issuanceId='+id.slice(3),undefined,'issuer-credential')).status,403);
});
