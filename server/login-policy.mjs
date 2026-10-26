import {createHmac,timingSafeEqual} from 'node:crypto';
import {authorize} from './security.mjs';
export const TECH_COOKIE='__Host-center-tech';
export function members(env){
  const accounts=JSON.parse(env.CENTER_MEMBERS_JSON||'[]');
  // Keep the existing private team list intact. Administrators are explicitly
  // configured on the server and still need a confirmed Identity account.
  for(const value of (env.CENTER_ADMIN_EMAILS||'').split(',')){
    const email=value.trim().toLowerCase();
    if(!email)continue;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('E-mail de administrador inválido na configuração.');
    const index=accounts.findIndex(account=>account.email.toLowerCase()===email);
    if(index<0)accounts.push({email,name:email,roles:['admin'],active:true});
    else accounts[index]={...accounts[index],roles:[...new Set([...accounts[index].roles,'admin'])],active:true};
  }
  return accounts;
}
export function identityAccess(user,env){
  if(!user?.id||!user.email||!user.confirmedAt)return null;
  const account=members(env).find(m=>m.email.toLowerCase()===user.email.toLowerCase()&&m.active!==false);
  if(!account)return null;
  return {id:user.email.toLowerCase(),identityId:user.id,name:account.name,email:user.email.toLowerCase(),roles:account.roles.filter(r=>['member','issuer','editor','admin'].includes(r)),method:'identity',mustChangePassword:user.appMetadata?.must_change_password===true};
}
const mac=(value,env)=>createHmac('sha256',Buffer.from(env.SETTINGS_KEY||'','base64')).update(value).digest('base64url');
export function technicalSession(credential,env,time=Date.now()){
  if(Buffer.from(env.SETTINGS_KEY||'','base64').length!==32)throw Error('Configuração de sessão indisponível.');
  const operator=authorize('Bearer '+credential,JSON.parse(env.OPERATORS_JSON||'[]'));
  if(!operator?.roles?.includes('admin'))return null;
  const value=Buffer.from(JSON.stringify({id:operator.id,digest:operator.sha256,exp:time+3600000})).toString('base64url');
  return value+'.'+mac(value,env);
}
export function technicalAccess(req,env,time=Date.now()){
  try{
    const cookies=(req.headers.get('Cookie')||'').split(';').map(c=>c.trim()),value=cookies.find(c=>c.startsWith(TECH_COOKIE+'='))?.slice(TECH_COOKIE.length+1);if(!value)return null;
    const [payload,sig,...extra]=value.split('.'),expected=mac(payload,env);
    if(extra.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
    const s=JSON.parse(Buffer.from(payload,'base64url'));if(!Number.isFinite(s.exp)||s.exp<=time)return null;
    const operator=JSON.parse(env.OPERATORS_JSON||'[]').find(o=>o.id===s.id&&o.sha256===s.digest&&o.roles?.includes('admin'));
    return operator?{id:operator.id,roles:operator.roles,method:'technical'}:null;
  }catch{return null;}
}
