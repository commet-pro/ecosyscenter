import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';

const digest=s=>createHash('sha256').update(s).digest('hex');
const reply=(status,data,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
const safeUrl=(value,pattern)=>{try{const u=new URL(value);return u.protocol==='https:'&&pattern.test(u.hostname)?u.href:undefined;}catch{return undefined;}};

export function marketplace({store,env,request=fetch,now=()=>new Date()}) {
  const origin=env.PUBLIC_ORIGIN||env.URL;
  const callback=origin+'/integrations/mercadolivre/callback';
  const get=key=>store.get('meli/'+key,{type:'json'});
  const put=(key,value,options)=>store.setJSON('meli/'+key,value,options);
  function key(){const value=Buffer.from(env.SETTINGS_KEY||'','base64');if(value.length!==32)throw Error('Configuração privada incompleta.');return value;}
  function seal(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv),data=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return {iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:data.toString('base64')};}
  function open(value){if(!value)return null;const d=createDecipheriv('aes-256-gcm',key(),Buffer.from(value.iv,'base64'));d.setAuthTag(Buffer.from(value.tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(value.data,'base64')),d.final()]).toString());}
  const credentials=async()=>open(await get('credentials'));
  async function api(path,accessToken){
    const r=await request('https://api.mercadolibre.com'+path,{headers:{Authorization:'Bearer '+accessToken},signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw Error('Mercado Livre respondeu '+r.status+'. Confira a conexão da conta.');
    return r.json();
  }
  async function exchange(config,params){
    const r=await request('https://api.mercadolibre.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,...params}),signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw Error('Não foi possível autorizar ou renovar o acesso ao Mercado Livre. Reconecte a conta.');
    const t=await r.json();
    if(!t.access_token||!t.refresh_token||String(t.user_id)!==config.sellerId||!Number.isFinite(t.expires_in))throw Error('A conta autorizada não corresponde ao vendedor configurado.');
    return {...config,accessToken:t.access_token,refreshToken:t.refresh_token,expiresAt:now().getTime()+t.expires_in*1000};
  }
  async function lease(){
    const old=await store.getWithMetadata('meli/lock',{type:'json'});
    if(old?.data?.until>now().getTime())return null;
    const id=randomBytes(16).toString('hex');
    const result=await put('lock',{id,until:now().getTime()+14*60*1000},old?{onlyIfMatch:old.etag}:{onlyIfNew:true});
    return result.modified?id:null;
  }
  async function release(id){const old=await store.getWithMetadata('meli/lock',{type:'json'});if(old?.data?.id===id)await put('lock',{id,until:0},{onlyIfMatch:old.etag});}
  async function admin(req,path){
    if(path==='/api/mercadolivre/status'&&req.method==='GET'){
      const c=await credentials(),status=await get('status');return reply(200,{configured:!!c,connected:!!c?.refreshToken,sellerId:c?.sellerId,clientId:c?.clientId,callback,...status});
    }
    if(path==='/api/mercadolivre/config'&&req.method==='POST'){
      const raw=await req.text();if(raw.length>4096)throw Error('Pedido muito grande.');
      const v=JSON.parse(raw),old=await credentials();
      if(!/^\d{4,30}$/.test(v.clientId||'')||!/^\d{4,30}$/.test(v.sellerId||'')||typeof v.clientSecret!=='string'||v.clientSecret.length<10||v.clientSecret.length>300)throw Error('Informe App ID, Client Secret e ID do vendedor válidos.');
      const lock=await lease();if(!lock)throw Error('Uma sincronização está em andamento. Tente novamente em alguns minutos.');
      try{await put('credentials',seal({clientId:v.clientId,clientSecret:v.clientSecret,sellerId:v.sellerId}));await put('catalog',{version:1,connected:false,products:[]});await put('status',{connected:false,message:'Configuração salva. Autorize a conta vendedora.'});}finally{await release(lock);}
      return reply(200,{ok:true,reconnect:!!old});
    }
    if(path==='/api/mercadolivre/connect'&&req.method==='POST'){
      const c=await credentials();if(!c)throw Error('Salve a configuração do aplicativo primeiro.');
      const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url'),binding=randomBytes(32).toString('base64url');
      await put('oauth/'+digest(state),seal({verifier,binding:digest(binding),clientId:c.clientId,sellerId:c.sellerId,expires:now().getTime()+10*60*1000}));
      const url=new URL('https://auth.mercadolivre.com.br/authorization');
      url.search=new URLSearchParams({response_type:'code',client_id:c.clientId,redirect_uri:callback,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
      return reply(200,{url:url.href},{'Set-Cookie':`center_meli=${binding}; Path=/integrations/mercadolivre/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`});
    }
    return reply(404,{error:'Rota não encontrada.'});
  }
  async function authorizeCallback(req){
    try{
      const u=new URL(req.url),state=u.searchParams.get('state'),code=u.searchParams.get('code');
      if(!state||!code||state.length>100||code.length>1000)throw Error('Autorização ausente ou cancelada.');
      const stateKey=digest(state),s=open(await get('oauth/'+stateKey)),binding=/(?:^|;\s*)center_meli=([^;]+)/.exec(req.headers.get('Cookie')||'')?.[1];
      if(!s||s.expires<now().getTime()||!binding||digest(binding)!==s.binding)throw Error('Autorização expirada. Inicie a conexão novamente no ecossistema.');
      if(!(await put('oauth-used/'+stateKey,{at:now().toISOString()},{onlyIfNew:true})).modified)throw Error('Autorização já utilizada.');
      const lock=await lease();if(!lock)throw Error('Sincronização em andamento. Reinicie a conexão em alguns minutos.');
      try{
        const c=await credentials();if(c.clientId!==s.clientId||c.sellerId!==s.sellerId)throw Error('Configuração alterada. Inicie a autorização novamente.');
        await put('credentials',seal(await exchange(c,{grant_type:'authorization_code',code,redirect_uri:callback,code_verifier:s.verifier})));
        await put('status',{connected:true,message:'Conta conectada. A importação ocorre automaticamente em até 15 minutos.'});
      }finally{await release(lock);}
      return new Response(null,{status:303,headers:{Location:origin+'/marketing/mercado-livre/?mercadolivre=connected','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':'center_meli=; Path=/integrations/mercadolivre/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
    }catch(e){return reply(400,{error:e.message});}
  }
  function mapItem(item){
    const image=safeUrl(item.pictures?.[0]?.secure_url||item.secure_thumbnail,/(^|\.)mlstatic\.com$/i);
    const url=safeUrl(item.permalink,/(^|\.)mercadolivre\.com\.br$/i);
    if(!image||!url)return null;
    const attributes=item.attributes||[],attr=id=>attributes.find(a=>a.id===id)?.value_name;
    return {slug:item.id.toLowerCase(),name:item.title,shortName:item.title,code:attr('SELLER_SKU')||item.seller_custom_field||item.id,
      category:'componentes',categoryLabel:'Componentes técnicos',description:item.title,application:attr('MODEL')||'Confirme a aplicação no anúncio',
      dimensions:'Confira as medidas no anúncio',reference:attr('PART_NUMBER')||item.id,availability:'Disponível no Mercado Livre',visualMark:'ML',image,imageAlt:item.title,
      features:attributes.filter(a=>a.value_name).slice(0,8).map(a=>a.name+': '+a.value_name),identification:['Confira as informações do anúncio antes de comprar.','Confirme código, medida e aplicação com a equipe Center Ônibus.'],marketplaceUrl:url,...(item.currency_id==='BRL'&&Number.isFinite(item.price)?{price:item.price}:{})};
  }
  async function sync(){
    if(env.CENTER_ENV!=='production')return;
    let c=await credentials();if(!c?.refreshToken)return;
    const lock=await lease();if(!lock)return;
    try{
      c=await credentials();
      if(c.expiresAt<now().getTime()+120000){c=await exchange(c,{grant_type:'refresh_token',refresh_token:c.refreshToken});await put('credentials',seal(c));}
      const deadline=Date.now()+12*60*1000,ids=new Set(),products=[];let scroll;
      do{
        if(Date.now()>deadline)throw Error('Importação excedeu o prazo. O catálogo anterior foi preservado.');
        const query=new URLSearchParams({search_type:'scan',limit:'100',status:'active',...(scroll?{scroll_id:scroll}:{})});
        const page=await api(`/users/${c.sellerId}/items/search?${query}`,c.accessToken);
        if(!Array.isArray(page.results))throw Error('Resposta de catálogo inválida.');
        if(!page.results.length)break;
        for(const id of page.results){if(!/^MLB\d+$/.test(id)||ids.has(id))throw Error('Paginação inconsistente. O catálogo anterior foi preservado.');ids.add(id);}
        for(let i=0;i<page.results.length;i+=20){
          const batch=page.results.slice(i,i+20),items=await api('/items?ids='+batch.join(','),c.accessToken);
          if(!Array.isArray(items)||items.length!==batch.length)throw Error('Importação incompleta.');
          for(const entry of items){if(entry.code!==200)throw Error('Não foi possível consultar todos os anúncios.');const item=entry.body;
            if(String(item.seller_id)!==c.sellerId)throw Error('Vendedor divergente.');
            if(item.status==='active'&&item.available_quantity>0){const product=mapItem(item);if(product)products.push(product);}
          }
        }
        if(!page.scroll_id&&page.results.length>=100)throw Error('Paginação ausente.');
        scroll=page.scroll_id;
      }while(scroll);
      const updatedAt=now().toISOString();await put('catalog',{version:1,connected:true,updatedAt,products});
      await put('status',{connected:true,updatedAt,count:products.length,message:'Catálogo atualizado.'});
    }catch(e){await put('status',{connected:true,failedAt:now().toISOString(),message:e.message});throw e;}
    finally{await release(lock);}
  }
  async function catalog(req){if(req.method!=='GET')return reply(405,{error:'Método não permitido.'});return reply(200,await get('catalog')||{version:1,connected:false,products:[]});}
  return {admin,authorizeCallback,sync,catalog};
}
