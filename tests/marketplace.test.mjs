import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {marketplace} from '../server/marketplace.mjs';

function fixture(){
  const data=new Map(),versions=new Map(),calls=[];
  const store={
    async get(k){return structuredClone(data.get(k)||null);},
    async getWithMetadata(k){return data.has(k)?{data:structuredClone(data.get(k)),etag:String(versions.get(k))}:null;},
    async setJSON(k,v,o={}){if(o.onlyIfNew&&data.has(k)||o.onlyIfMatch&&o.onlyIfMatch!==String(versions.get(k)))return {modified:false};data.set(k,structuredClone(v));versions.set(k,(versions.get(k)||0)+1);return {modified:true};},
  };
  const env={PUBLIC_ORIGIN:'https://intranet.example',CENTER_ENV:'production',SETTINGS_KEY:randomBytes(32).toString('base64')};
  let fail=false,expired=false,pages=0,clock=new Date('2026-10-26T15:00:00Z');
  const item={id:'MLB123456',seller_id:12345,title:'Peça real',status:'active',available_quantity:2,currency_id:'BRL',price:125,pictures:[{secure_url:'https://http2.mlstatic.com/D_NQ.jpg'}],permalink:'https://produto.mercadolivre.com.br/MLB-123456-peca',attributes:[]};
  const request=async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/oauth/token'))return Response.json({access_token:'private-access',refresh_token:'private-refresh',user_id:12345,expires_in:expired?0:21600});
    if(fail)return new Response('',{status:503});
    if(url.includes('/items/search'))return Response.json({results:pages++%2===0?['MLB123456']:[],scroll_id:'next'});
    return Response.json([{code:200,body:item}]);
  };
  const app=marketplace({store,env,request,now:()=>clock});
  const admin=(path,body)=>app.admin(new Request(env.PUBLIC_ORIGIN+'/api/mercadolivre/'+path,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})}),'/api/mercadolivre/'+path);
  async function connect(){
    await admin('config',{clientId:'99999',clientSecret:'private-client-secret',sellerId:'12345'});
    const response=await admin('connect',{}),url=new URL((await response.json()).url),cookie=response.headers.get('Set-Cookie').split(';')[0];
    const callback=new Request(env.PUBLIC_ORIGIN+'/integrations/mercadolivre/callback?code=code&state='+url.searchParams.get('state'),{headers:{Cookie:cookie}});
    return {url,cookie,callback};
  }
  return {app,admin,data,calls,connect,item,setFail:v=>fail=v,setExpired:v=>expired=v,advance:()=>clock=new Date(+clock+3600000)};
}

test('OAuth: PKCE, cookie de vinculação, criptografia e código de uso único',async()=>{
  const f=fixture(),{url,callback}=await f.connect();
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal((await f.app.authorizeCallback(new Request(callback.url))).status,400);
  assert.equal((await f.app.authorizeCallback(callback.clone())).status,303);
  assert.equal((await f.app.authorizeCallback(callback.clone())).status,400);
  assert.ok(!JSON.stringify([...f.data.values()]).includes('private-'));
  const status=await(await f.admin('status')).json();assert.equal(status.connected,true);assert.equal(status.clientSecret,undefined);
});

test('sincroniza uma vez sob concorrência, preserva snapshot em falhas e remove anúncios pausados',async()=>{
  const f=fixture(),{callback}=await f.connect();await f.app.authorizeCallback(callback);
  await Promise.all([f.app.sync(),f.app.sync()]);
  assert.equal(f.calls.filter(c=>c.url.includes('/items?')).length,1);
  const catalog=await(await f.app.catalog(new Request('https://intranet.example/public/catalog'))).json();
  assert.equal(catalog.products.length,1);assert.equal(catalog.products[0].price,125);
  assert.ok(!JSON.stringify(catalog).includes('private-'));
  f.setFail(true);await assert.rejects(f.app.sync());assert.deepEqual(f.data.get('meli/catalog'),catalog);
  f.setFail(false);f.item.status='paused';await f.app.sync();assert.equal(f.data.get('meli/catalog').products.length,0);
});

test('renova tokens no servidor e impede importar produtos de outra conta',async()=>{
  const f=fixture();f.setExpired(true);const {callback}=await f.connect();await f.app.authorizeCallback(callback);
  f.setExpired(false);f.advance();await f.app.sync();
  assert.equal(f.calls.filter(c=>c.url.endsWith('/oauth/token')).length,2);
  f.item.seller_id=99999;await assert.rejects(f.app.sync(),/Vendedor divergente/);
  assert.equal(f.data.get('meli/catalog').products.length,1);
});
