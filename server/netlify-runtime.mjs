import {getStore} from '@netlify/blobs';
import publicKey from '../build/chave-publica.json' with {type:'json'};
import {cloudApp} from './cloud.mjs';
import {getUser,admin} from '@netlify/identity';
import {identityAccess,technicalAccess} from './login-policy.mjs';
export async function verifiedIdentityUser(identity={getUser,admin}){
  const user=await identity.getUser();
  // The runtime can return verified JWT claims without the confirmation date.
  // Fetch the full authoritative record instead of rejecting that valid session.
  return user?.id&&!user.confirmedAt?await identity.admin.getUser(user.id):user;
}
export async function portalUser(req){
  const technical=technicalAccess(req,process.env);if(technical)return technical;
  const user=await verifiedIdentityUser();return identityAccess(user,process.env);
}
export function app(){return cloudApp({store:getStore({name:'center-'+(process.env.CENTER_ENV==='production'?'production':'preview'),consistency:'strong'}),env:process.env,publicKey:publicKey.pub_b64,resolveUser:portalUser});}
