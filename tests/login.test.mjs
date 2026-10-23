import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {identityAccess,technicalSession,technicalAccess,TECH_COOKIE} from '../server/login-policy.mjs';
import {hash} from '../server/security.mjs';
import identityEvents from '../netlify/functions/identity.mjs';
const env=()=>({SETTINGS_KEY:randomBytes(32).toString('base64'),OPERATORS_JSON:JSON.stringify([{id:'rafa',sha256:hash('test-admin-only'),roles:['admin']}]),CENTER_MEMBERS_JSON:JSON.stringify([{name:'Admin',email:'admin@example.com',roles:['member','admin']},{name:'Pessoa',email:'member@example.com',roles:['member','issuer','editor']},{name:'Revogado',email:'revoked@example.com',roles:['member'],active:false}])});
test('Identity exige e-mail confirmado e lista autorizada; ignora papéis editáveis ou falsos',()=>{
 const e=env(),user={id:'verified-user',email:'MEMBER@example.com',confirmedAt:'2026-10-23T10:00:00Z',roles:['admin'],userMetadata:{roles:['admin']}};
 assert.equal(identityAccess(null,e),null);assert.equal(identityAccess({...user,confirmedAt:undefined},e),null);
 assert.equal(identityAccess({...user,email:'outsider@example.com'},e),null);assert.equal(identityAccess({...user,email:'revoked@example.com'},e),null);
 const allowed=identityAccess(user,e);assert.equal(allowed.email,'member@example.com');assert.ok(!allowed.roles.includes('admin'));
 assert.ok(identityAccess({...user,email:'admin@example.com'},e).roles.includes('admin'));
});
test('sessão técnica expira, respeita revogação e rejeita alteração de cookie',()=>{
 const e=env(),time=Date.now(),value=technicalSession('test-admin-only',e,time),req=value=>new Request('https://center.example/',{headers:{Cookie:TECH_COOKIE+'='+value}});
 assert.equal(technicalAccess(req(value),e,time).id,'rafa');
 assert.equal(technicalAccess(req(value),e,time+3600001),null);assert.equal(technicalAccess(req(value+'tampered'),e,time),null);
 assert.equal(technicalAccess(req(value),{...e,OPERATORS_JSON:'[]'},time),null);assert.equal(technicalSession('wrong',e),null);
 assert.equal(technicalAccess(req('invalid'),e),null);
});
test('Identity bloqueia cadastros e logins fora da lista; define papéis no servidor',()=>{
 const previous=process.env.CENTER_MEMBERS_JSON;process.env.CENTER_MEMBERS_JSON=env().CENTER_MEMBERS_JSON;
 try{let denied=0;identityEvents.userValidate({user:{email:'outsider@example.com'},deny(){denied++;}});identityEvents.userLogin({user:{email:'revoked@example.com'},deny(){denied++;}});assert.equal(denied,2);
 const result=identityEvents.userSignup({user:{email:'member@example.com',appMetadata:{roles:['admin']}},deny(){throw Error('não deveria negar');}});assert.deepEqual(result.user.appMetadata.roles,['member','issuer','editor']);
 }finally{if(previous===undefined)delete process.env.CENTER_MEMBERS_JSON;else process.env.CENTER_MEMBERS_JSON=previous;}
});
