import {login,logout,getUser,getSettings,handleAuthCallback,acceptInvite,updateUser,requestPasswordRecovery} from '@netlify/identity';
const byId=id=>document.getElementById(id);
const message=text=>{const e=byId('login-status');if(e)e.textContent=text;};
const next=()=>{const value=new URLSearchParams(location.search).get('next')||'/';return /^\/(?!\/)/.test(value)&&!value.includes('\\')&&!value.startsWith('/login')?value:'/';};
async function exit(){
  try{await logout();}finally{await fetch('/api/session',{method:'DELETE',credentials:'same-origin'});CenterAccess.credential='';location.assign('/login/');}
}
window.CenterIdentity={logout:exit};
function setPermissions(user){
  document.querySelectorAll('[data-role]').forEach(el=>{el.hidden=!user?.roles?.some(role=>role==='admin'||el.dataset.role.split(',').includes(role));});
  const account=byId('session-name');if(account)account.textContent=user?.name||user?.email||user?.id||'';
  const out=byId('session-logout');if(out)out.onclick=exit;
}
async function action(fn){const controls=[...document.querySelectorAll('#login-form button,#new-password-form button,#technical-form button')];controls.forEach(el=>el.disabled=true);try{await fn();}catch(e){message(e.status===400||e.status===401?'Não foi possível entrar. Confira o e-mail e a senha ou use a recuperação de acesso.':e.message||'Não foi possível concluir. Tente novamente.');}finally{controls.forEach(el=>el.disabled=false);}}
async function start(){
  try{
    const callback=await handleAuthCallback();
    if(callback?.type==='invite'||callback?.type==='recovery'){
      byId('login-form').hidden=true;byId('new-password-form').hidden=false;
      byId('password-title').textContent=callback.type==='invite'?'Defina sua senha de acesso':'Crie uma nova senha';
      message('Use uma senha exclusiva de pelo menos 12 caracteres.');
      byId('new-password-form').onsubmit=e=>{e.preventDefault();action(async()=>{
        const password=byId('new-password').value;if(password.length<12||password!==byId('confirm-password').value)throw Error('As senhas precisam ser iguais e ter pelo menos 12 caracteres.');
        if(callback.type==='invite')await acceptInvite(callback.token,password);else await updateUser({password});
        byId('new-password').value='';byId('confirm-password').value='';
        await CenterAccess.request('me');location.assign(next());
      });};
      CenterAccess.initialize(null);return;
    }
    // Hydrate the official SDK to restart automatic token refresh on every page.
    await getUser();
    let user=null;try{user=await CenterAccess.request('me');}catch(e){if(!byId('login-form'))throw e;}
    CenterAccess.initialize(user);setPermissions(user);
    if(!byId('login-form'))return;
    if(user){location.replace(next());return;}
    const settings=await getSettings();
    byId('login-form').onsubmit=e=>{e.preventDefault();action(async()=>{await login(byId('email').value.trim(),byId('password').value);byId('password').value='';try{await CenterAccess.request('me');}catch{await logout();throw Error('Seu e-mail ainda não tem acesso a este portal. Fale com a Commet.');}location.assign(next());});};
    byId('forgot-password').onclick=()=>action(async()=>{const email=byId('email').value.trim();if(!byId('email').checkValidity()||!email){byId('email').reportValidity();throw Error('Informe seu e-mail para recuperar o acesso.');}await requestPasswordRecovery(email);message('Se houver uma conta para esse e-mail, você receberá o link de recuperação. Confira também o spam.');});
    byId('technical-form').onsubmit=e=>{e.preventDefault();action(async()=>{const input=byId('technical-credential');const r=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:input.value.trim()})});input.value='';if(!r.ok)throw Error('Acesso técnico inválido.');location.assign(next());});};
    message(settings.disableSignup?'Acesso somente para pessoas convidadas. Use o e-mail informado à Center.':'Use seu e-mail corporativo e sua senha.');
  }catch(e){CenterAccess.initialize(null);message('Não foi possível carregar o acesso. '+e.message);if(!byId('login-form'))location.assign('/login/?next='+encodeURIComponent(location.pathname));}
}
start();
