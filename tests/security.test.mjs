import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,verify} from 'node:crypto';
import {authorize,hash,badge,location,signingKey,token} from '../server/security.mjs';
import {generate} from '../server/ai.mjs';
test('acesso individual e revogação',()=>{
 const users=[{id:'rh',sha256:hash('test-credential'),roles:['issuer']}];
 assert.equal(authorize('Bearer test-credential',users).id,'rh');
 assert.equal(authorize('Bearer wrong',users),undefined);
 assert.equal(authorize('Bearer test-credential',[]),undefined);
});
test('emissão exige identidade, validade futura e localização',()=>{
 const v={nome:'João',cargo:'Vendas',validade:'12/2099'};
 assert.equal(badge(v),'JOÃO|VENDAS|12/2099');
 for(const validade of ['00/2099','13/2099','12/2000','','12/9999'])assert.throws(()=>badge({...v,validade}));
 assert.throws(()=>badge({...v,nome:'João|Gerente'}));assert.throws(()=>badge({...v,cargo:''}));
 assert.throws(()=>location(null));assert.throws(()=>location({latitude:100,longitude:0,accuracy:1}));
 assert.equal(location({latitude:-23,longitude:-46,accuracy:30}).source,'browser-unverified');
});
test('assinatura Ed25519 compatível com CO1 e rejeição do par errado',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const pub=publicKey.export({type:'spki',format:'der'}).subarray(-32);
 const seed=privateKey.export({type:'pkcs8',format:'der'}).subarray(-32);
 const secret=Buffer.concat([seed,pub]).toString('base64url');
 const key=signingKey(secret,pub.toString('base64url'));
 const t=token('JOÃO|VENDAS|12/2099',key).split('.');
 assert.equal(t[0],'CO1');assert.ok(verify(null,Buffer.from(t[1],'base64url'),publicKey,Buffer.from(t[2],'base64url')));
 assert.throws(()=>signingKey(secret,'wrong'));
 assert.throws(()=>signingKey('',pub.toString('base64url')));
});
test('IA exige fontes reais retornadas pelo provedor e formato editorial',async()=>{
 const article={title:'Guia de peças',description:'Como planejar a compra.',paragraphs:['Confira referências.'],technicalClaims:false};
 const response=annotations=>async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(article),annotations}]}]})});
 const c={provider:'openai',model:'test',key:'not-a-real-key'};
 await assert.rejects(generate(c,'peças',response([])),/fontes/);
 const result=await generate(c,'peças',response([{type:'url_citation',url:'https://example.com/source',title:'Fonte'}]));
 assert.equal(result.sources.length,1);
 await assert.rejects(generate(c,'peças',response([{type:'url_citation',url:'javascript:alert(1)'}])),/fontes/);
});
test('Gemini usa pesquisa Google e conserva as fontes de grounding',async()=>{
 const article={title:'Guia Center',description:'Orientações de compra.',paragraphs:['Consulte a documentação do fabricante.'],technicalClaims:true};
 const mock=async(url,options)=>{assert.match(url,/generativelanguage.googleapis.com/);assert.equal(options.headers['x-goog-api-key'],'fake-key');assert.ok(JSON.parse(options.body).tools[0].google_search);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'```json\n'+JSON.stringify(article)+'\n```'}]},groundingMetadata:{groundingChunks:[{web:{title:'Fabricante',uri:'https://example.com/manual'}}]}}]})};};
 const result=await generate({provider:'google',model:'test',key:'fake-key'},'peças',mock);assert.equal(result.technicalClaims,true);assert.equal(result.sources[0].title,'Fabricante');
});
