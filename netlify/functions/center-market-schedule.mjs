import {createHmac} from 'node:crypto';
export default async()=>{
  if(process.env.CENTER_ENV!=='production'||!process.env.SETTINGS_KEY)return;
  const signature=createHmac('sha256',process.env.SETTINGS_KEY).update('market-'+Math.floor(Date.now()/60000)).digest('hex');
  const response=await fetch((process.env.PUBLIC_ORIGIN||process.env.URL)+'/.netlify/functions/center-market-background',{
    method:'POST',headers:{'X-Center-Sync':signature},signal:AbortSignal.timeout(20000),
  });
  if(response.status!==202)throw Error('Não foi possível iniciar a atualização do catálogo.');
};
// Every 15 minutes in UTC (the interval is identical in Brasília).
export const config={schedule:'*/15 * * * *'};
