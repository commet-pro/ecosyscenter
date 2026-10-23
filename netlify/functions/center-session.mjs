import {TECH_COOKIE,technicalSession} from '../../server/login-policy.mjs';
import {app} from '../../server/netlify-runtime.mjs';
export default async(req,context)=>{
  const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
  if(req.headers.get('Origin')!==process.env.PUBLIC_ORIGIN)return new Response(JSON.stringify({error:'Origem não autorizada.'}),{status:403,headers});
  if(req.method==='DELETE')return new Response('{}',{headers:{...headers,'Set-Cookie':TECH_COOKIE+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'}});
  if(req.method!=='POST')return new Response('{}',{status:405,headers});
  try{
    const text=await req.text();if(text.length>2000)throw Error('Pedido inválido.');
    const credential=JSON.parse(text).credential;if(typeof credential!=='string')throw Error('Credencial inválida.');
    const value=technicalSession(credential,process.env);
    const auditReq=new Request(new URL('/api/me',req.url),{headers:{Authorization:'Bearer '+credential}});
    await app().api(auditReq,context);
    if(!value)return new Response(JSON.stringify({error:'Credencial administrativa inválida.'}),{status:401,headers});
    return new Response('{}',{headers:{...headers,'Set-Cookie':TECH_COOKIE+'='+value+'; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Strict'}});
  }catch{return new Response(JSON.stringify({error:'Não foi possível iniciar a sessão técnica.'}),{status:400,headers});}
};
export const config={path:'/api/session',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowLimit:10,windowSize:60}};
