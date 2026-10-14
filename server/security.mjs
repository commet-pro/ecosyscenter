import { createHash, timingSafeEqual, createPrivateKey, createPublicKey, sign } from 'node:crypto';
export const hash = s => createHash('sha256').update(s).digest('hex');
export function authorize(header, operators) {
  const digest = hash((header || '').replace(/^Bearer /, ''));
  return operators.find(o => /^[a-f0-9]{64}$/.test(o.sha256 || '') && timingSafeEqual(Buffer.from(digest), Buffer.from(o.sha256)));
}
export function badge(v, now = new Date()) {
  for (const k of ['nome','cargo']) if (typeof v[k] !== 'string' || !v[k].trim() || v[k].length > 80 || /[|\x00-\x1f]/.test(v[k])) throw Error('Nome e cargo obrigatórios, até 80 caracteres e sem separadores.');
  if (!/^(0[1-9]|1[0-2])\/20\d{2}$/.test(v.validade || '')) throw Error('Validade inválida. Use MM/AAAA.');
  const [m,y] = v.validade.split('/').map(Number);
  if (new Date(y,m,1) <= now) throw Error('Validade já expirada.');
  return [v.nome.trim().toUpperCase(),v.cargo.trim().toUpperCase(),v.validade].join('|');
}
export function signingKey(secret, expected) {
  const bytes = Buffer.from(secret || '', 'base64url');
  if (bytes.length !== 64) throw Error('Chave privada de emissão não configurada.');
  const key = createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),bytes.subarray(0,32)]),format:'der',type:'pkcs8'});
  const pub = createPublicKey(key).export({format:'der',type:'spki'}).subarray(-32).toString('base64url');
  if (pub !== expected) throw Error('Chave privada não corresponde à pública do site.');
  return key;
}
export function token(payload, key) {
  const bytes = Buffer.from(payload);
  return `CO1.${bytes.toString('base64url')}.${sign(null,bytes,key).toString('base64url')}`;
}
export function location(v) {
  if (!v || !Number.isFinite(v.latitude) || !Number.isFinite(v.longitude) || Math.abs(v.latitude)>90 || Math.abs(v.longitude)>180 || !Number.isFinite(v.accuracy) || v.accuracy<0) throw Error('Permita a localização para emitir.');
  return {latitude:v.latitude,longitude:v.longitude,accuracy:v.accuracy,source:'browser-unverified'};
}
