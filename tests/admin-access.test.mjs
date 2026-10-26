import {test} from 'node:test';
import assert from 'node:assert/strict';
import {members,identityAccess} from '../server/login-policy.mjs';

const email='rafael@commet.pro';
const user={id:'verified-identity-id',email,confirmedAt:'2026-10-26T12:00:00Z'};
test('administrador explícito exige identidade confirmada e preserva a equipe',()=>{
  const team=[{email:'equipe@example.com',name:'Equipe',roles:['member'],active:true}];
  const env={CENTER_MEMBERS_JSON:JSON.stringify(team),CENTER_ADMIN_EMAILS:' RAFAEL@COMMET.PRO '};
  assert.deepEqual(members(env)[0],team[0]);
  assert.deepEqual(identityAccess(user,env).roles,['admin']);
  assert.equal(identityAccess({...user,confirmedAt:null},env),null);
  assert.equal(identityAccess({...user,email:'outro@example.com'},env),null);
  assert.equal(identityAccess(user,{...env,CENTER_ADMIN_EMAILS:''}),null);
});
test('repara papel do administrador escolhido sem elevar os outros usuários',()=>{
  const env={CENTER_MEMBERS_JSON:JSON.stringify([{email,roles:['editor'],active:false},{email:'equipe@example.com',roles:['member'],active:true}]),CENTER_ADMIN_EMAILS:email+','+email};
  const list=members(env);assert.equal(list.length,2);assert.deepEqual(list[0].roles,['editor','admin']);assert.equal(list[0].active,true);
  assert.deepEqual(list[1].roles,['member']);assert.throws(()=>members({CENTER_ADMIN_EMAILS:'email-inválido'}));
});
