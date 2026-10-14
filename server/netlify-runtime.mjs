import {getStore} from '@netlify/blobs';
import publicKey from '../build/chave-publica.json' with {type:'json'};
import {cloudApp} from './cloud.mjs';
export function app(){return cloudApp({store:getStore({name:'center-'+(process.env.CENTER_ENV==='production'?'production':'preview'),consistency:'strong'}),env:process.env,publicKey:publicKey.pub_b64});}
