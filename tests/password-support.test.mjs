import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replacePassword} from '../server/password-support.mjs';
import {identityAccess} from '../server/login-policy.mjs';
import {cloudApp} from '../server/cloud.mjs';
test('senha temporária mantém papéis e exige troca com marcação exclusiva do servidor',async()=>{
 const user={id:'id',email:'member@example.com',confirmedAt:'today',appMetadata:{roles:['issuer'],other:'keep'}};
 let update;
 await replacePassword({async updateUser(id,attributes){update={id,...attributes};}},user,'random-password-12345',true);
 assert.deepEqual(update.app_metadata,{roles:['issuer'],other:'keep',must_change_password:true});
 const env={CENTER_MEMBERS_JSON:JSON.stringify([{email:user.email,roles:['issuer']}])};
 assert.equal(identityAccess({...user,appMetadata:update.app_metadata},env).mustChangePassword,true);
 assert.equal(identityAccess({...user,userMetadata:{must_change_password:false},appMetadata:update.app_metadata},env).mustChangePassword,true);
 await assert.rejects(replacePassword({updateUser(){assert.fail();}},user,'short'),/12 a 128/);
});
test('sessão temporária lê identificação mas não executa módulos nem altera configurações',async()=>{
 const app=cloudApp({store:{async setJSON(){}},env:{PUBLIC_ORIGIN:'https://center.example'},resolveUser:async()=>({id:'member',roles:['admin'],mustChangePassword:true})});
 const me=await app.api(new Request('https://center.example/api/me'));
 assert.equal(me.status,200);assert.equal((await me.json()).mustChangePassword,true);
 assert.equal((await app.api(new Request('https://center.example/api/ai/config'))).status,403);
});
