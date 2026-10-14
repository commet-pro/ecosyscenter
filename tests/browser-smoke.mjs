// Optional browser check: PLAYWRIGHT_PATH points to a locally installed playwright package.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {hash} from '../server/security.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const dir=mkdtempSync(join(tmpdir(),'center-browser-'));
const server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'0',DATA_DIR:dir,OPERATORS_JSON:JSON.stringify([{id:'browser-test',sha256:hash('browser-test-credential'),roles:['admin']}])},stdio:['ignore','pipe','pipe']});
let browser;
try{
 const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),10000);server.stdout.on('data',d=>{const m=/PORT=(\d+)/.exec(d.toString());if(m){clearTimeout(timer);resolve('http://127.0.0.1:'+m[1]);}});});
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 for(const width of [1280,390]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/','/marketing/cartao/','/marketing/cracha/','/marketing/validador/','/marketing/template-email/','/marketing/assistente/','/v/']) {
   await page.goto(url+path);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
   assert.deepEqual(errors,[],`${width} ${path}: erro JS`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,`${width} ${path}: transbordamento horizontal`);
   if(path==='/marketing/cartao/') {
    await page.fill('#cartao-nome','Nome de teste');await page.waitForTimeout(100);
    assert.match(await page.locator('#stage').textContent(),/NOME DE TESTE/);
    await page.evaluate(async()=>{await montarImpressao([dados()]);});
    assert.equal(await page.locator('#print .peca').count(),2);
   }
   if(path==='/marketing/cracha/')assert.equal(await page.locator('[data-precisa-chave]').first().isDisabled(),true);
   if(path==='/marketing/assistente/') {
    assert.equal(await page.locator('#enabled').isChecked(),false);
    await page.fill('#access','browser-test-credential');await page.click('#connect');
    await page.locator('#ai-status').filter({hasText:'Conectado como browser-test'}).waitFor();
    assert.equal(await page.locator('#access').inputValue(),'');
    await page.click('#audit');await page.locator('#audit-output').filter({hasText:'access.connected'}).waitFor();
    await page.click('#logout');assert.equal(await page.locator('#audit-output').textContent(),'');
   }
  }
  await page.close();console.log(`Navegação e layout aprovados: ${width}px`);
 }
}finally{if(browser)await browser.close();server.kill();await new Promise(r=>server.once('exit',r));rmSync(dir,{recursive:true,force:true});}
