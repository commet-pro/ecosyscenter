import {admin} from '@netlify/identity';
import {verifiedIdentityUser} from '../../server/netlify-runtime.mjs';
import {identityAccess} from '../../server/login-policy.mjs';
import {replacePassword} from '../../server/password-support.mjs';
import {getStore} from '@netlify/blobs';
import {randomUUID} from 'node:crypto';
export default async(req,context)=>{
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return new Response(null,{status:405,headers});
 if(req.headers.get('Origin')!==process.env.PUBLIC_ORIGIN)return new Response(null,{status:403,headers});
 try{
  const user=await verifiedIdentityUser();if(!identityAccess(user,process.env))return new Response(null,{status:401,headers});
  const raw=await req.text();if(raw.length>512)throw Error('Pedido inválido.');
  await replacePassword(admin,user,JSON.parse(raw).password);
  const at=new Date().toISOString();await getStore({name:'center-'+(process.env.CENTER_ENV==='production'?'production':'preview'),consistency:'strong'}).setJSON('audit/'+at+'/'+randomUUID(),{at,actor:user.email.toLowerCase(),action:'access.password.changed',ip:context.ip||'unknown'});
  return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Não foi possível salvar a senha. Use de 12 a 128 caracteres e tente novamente.'},{status:400,headers});}
};
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip'],windowLimit:5,windowSize:60}};
