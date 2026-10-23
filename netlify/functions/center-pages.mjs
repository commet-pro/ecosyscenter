import {readFileSync} from 'node:fs';
import {portalUser} from '../../server/netlify-runtime.mjs';
const modules=['cartao','cracha','validador','template-email','assistente'];
export default async req=>{
  const path=new URL(req.url).pathname;
  const user=await portalUser(req);
  if(!user)return new Response(null,{status:302,headers:{Location:'/login/?next='+encodeURIComponent(path),'Cache-Control':'no-store'}});
  let file;
  if(path==='/'||path==='/index.html')file='dist/index.html';
  else{
    const m=/^\/marketing\/([a-z-]+)(?:\/index\.html|\/)?$/.exec(path);
    if(!m||!modules.includes(m[1]))return new Response('Página não encontrada.',{status:404});
    if(!path.endsWith('/')&&!path.endsWith('.html'))return new Response(null,{status:302,headers:{Location:path+'/'}});
    file='dist/marketing/'+m[1]+'/index.html';
  }
  return new Response(readFileSync(file),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'geolocation=(self), camera=(self)'}});
};
export const config={path:['/','/index.html','/marketing/*']};
