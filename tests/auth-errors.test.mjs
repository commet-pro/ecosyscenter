import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage,normalizeEmail} from '../client/auth-errors.mjs';
test('recuperação orienta conta ausente, limite e link expirado em português',()=>{
 assert.equal(normalizeEmail('  Nikolas.Duarte@centeronibus.com.br  '),'nikolas.duarte@centeronibus.com.br');
 assert.match(authErrorMessage({status:404,message:'User not found'},'recovery'),/e-mail corporativo completo/);
 assert.match(authErrorMessage({status:429,message:'Rate limit exceeded, try again later'},'recovery'),/limite de solicitações/);
 assert.match(authErrorMessage({status:400,message:'Token expired'}),/expirou/);
 assert.match(authErrorMessage({status:400},'recovery'),/enviar a recuperação/);
});
