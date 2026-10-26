import {admin} from '@netlify/identity';
import {authorize} from '../../server/security.mjs';
import {identityAccess} from '../../server/login-policy.mjs';
import {replacePassword} from '../../server/password-support.mjs';
import {getStore} from '@netlify/blobs';
import {randomUUID} from 'node:crypto';
export default async(req,context)=>{
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return new Response(null,{status:405,headers});
 if(req.headers.get('Origin')!==process.env.PUBLIC_ORIGIN)return new Response(null,{status:403,headers});
 const operator=authorize(req.headers.get('Authorization'),JSON.parse(process.env.OPERATORS_JSON||'[]'));
 if(!operator?.roles.includes('admin'))return new Response(null,{status:401,headers});
 if(Date.now()>Date.parse('2026-10-28T00:00:00-03:00'))return new Response(null,{status:410,headers});
 try{
  const raw=await req.text();if(raw.length>512)throw Error('Pedido inválido.');
  const user=await admin.getUser('8d895c0a-ca49-4238-8a7d-e840c93a991f');
  // Existing member only; this support operation never creates accounts or changes roles.
  if(!identityAccess({...user,confirmedAt:user.confirmedAt||'support'},process.env))return new Response(null,{status:403,headers});
  const updated=await replacePassword(admin,user,JSON.parse(raw).password,true);
  const at=new Date().toISOString();await getStore({name:'center-production',consistency:'strong'}).setJSON('audit/'+at+'/'+randomUUID(),{at,actor:operator.id,action:'access.password.support',ip:context.ip||'unknown',email:updated.email});
  return Response.json({ok:true,email:updated.email,confirmed:!!updated.confirmedAt},{headers});
 }catch(e){return Response.json({error:e.message},{status:400,headers});}
};
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip'],windowLimit:3,windowSize:60}};
