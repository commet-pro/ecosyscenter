import {createHmac,timingSafeEqual} from 'node:crypto';
import {app} from '../../server/netlify-runtime.mjs';
export default async req=>{
  const minute=String(Math.floor(Date.now()/60000));
  const signature=req.headers.get('X-Center-Sync')||'';
  const valid=[minute,String(+minute-1)].some(time=>{
    const expected=createHmac('sha256',process.env.SETTINGS_KEY||'').update('market-'+time).digest('hex');
    return signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
  });
  if(!process.env.SETTINGS_KEY||!valid)return;
  await app().market.sync();
};
export const config={background:true};
