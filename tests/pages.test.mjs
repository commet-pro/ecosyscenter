import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const pages=['login/index.html','index.html','marketing/cartao/index.html','marketing/cracha/index.html','marketing/validador/index.html','marketing/template-email/index.html','marketing/assistente/index.html','v/index.html'];
test('scripts das oito páginas e ativos compilam',()=>{
 for(const path of pages){const html=readFileSync(new URL('../'+path,import.meta.url),'utf8');for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:path});}
 for(const path of ['assets/base.js','assets/access.js','assets/assistant.js','assets/identity.bundle.js'])new vm.Script(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{filename:path});
});
test('validação pública continua independente do login',()=>{
 const html=readFileSync(new URL('../v/index.html',import.meta.url),'utf8');assert.ok(!html.includes('identity.bundle.js'));assert.ok(!html.includes('assets/access.js'));
});
function validator(payload,hashOverride){
 const html=readFileSync(new URL('../v/index.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 const res={innerHTML:''};const token='CO1.'+Buffer.from(payload).toString('base64url')+'.sig';
 const context=vm.createContext({document:{getElementById:()=>res},location:{hash:hashOverride??'#'+token,search:''},window:{addEventListener(){}},RED:'#f00',esc:s=>String(s||''),nacl:{sign:{detached:{verify:()=>true}}},b64uBytes:s=>Buffer.from(s,'base64url'),TextDecoder,CHAVE_PUBLICA:'test'});
 vm.runInContext(scripts.at(-1)[1],context);return res.innerHTML;
}
test('validador recusa datas malformadas e endereço inválido',()=>{
 for(const date of ['00/2099','13/2099','invalid',''])assert.match(validator('JOÃO|VENDAS|'+date),/Dados do crachá inválidos/);
 assert.match(validator('JOÃO|VENDAS|12/2099|extra'),/Dados do crachá inválidos/);
 assert.match(validator('JOÃO|VENDAS|12/2000'),/Crachá vencido/);
 assert.match(validator('JOÃO|VENDAS|12/2099'),/Crachá autêntico/);
 assert.match(validator('', '#%ZZ'),/Código malformado/);
 assert.match(validator('', '#CO1.a.b.c'),/Código malformado/);
});
