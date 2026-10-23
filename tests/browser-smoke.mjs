// Optional check against a real Netlify deploy (Identity is not available locally).
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.BROWSER_BASE_URL;
if(!base)throw Error('Configure BROWSER_BASE_URL com a URL de um deploy Netlify.');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/','/marketing/cartao/','/marketing/cracha/','/marketing/validador/','/marketing/template-email/','/marketing/assistente/']){
   await page.goto(base+path);await page.waitForURL('**/login/**');await page.locator('#login-form').waitFor();
   assert.equal(await page.locator('#email').count(),1);assert.equal(await page.locator('#password').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
  await page.goto(base+'/v/');assert.ok(!page.url().includes('/login/'));
  assert.deepEqual(errors,[]);await page.close();console.log(`Login e proteção verificados: ${width}px`);
 }
}finally{await browser.close();}
