import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completeInvite} from '../client/invite-session.mjs';
test('primeiro acesso estabelece sessão do servidor antes de liberar o portal',async()=>{
 let cookie=null;
 const user={email:'member@example.com'};
 const result=await completeInvite('invite-code','a-new-password',{
  async acceptInvite(token,password){assert.equal(token,'invite-code');assert.equal(password,'a-new-password');return user;},
  async login(email,password){assert.equal(email,user.email);assert.equal(password,'a-new-password');cookie='server-session';return user;}
 });
 assert.equal(result,user);assert.equal(cookie,'server-session');
});
test('convite recusado não estabelece sessão',async()=>{
 await assert.rejects(completeInvite('bad-token','a-new-password',{
  async acceptInvite(){throw Error('invalid invite');},
  async login(){assert.fail('não deve autenticar convite recusado');}
 }),/invalid invite/);
});
