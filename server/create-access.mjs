import {randomBytes,createHash} from 'node:crypto';
const credential=randomBytes(32).toString('base64url');
console.log('Entregue esta credencial individual por um canal privado:',credential);
console.log('Registro para OPERATORS_JSON:',JSON.stringify({id:process.argv[2]||'admin',sha256:createHash('sha256').update(credential).digest('hex'),roles:(process.argv[3]||'admin').split(',')}));
console.log('SETTINGS_KEY (somente ao configurar um servidor novo):',randomBytes(32).toString('base64'));
