export const normalizeEmail=value=>value.trim().toLowerCase();
export function authErrorMessage(error,context='login'){
  const text=String(error?.message||'');
  if(error?.status===429||/rate limit|too many requests/i.test(text))return 'O serviço de acesso atingiu o limite de solicitações. Aguarde antes de tentar novamente. Repetir o pedido agora não libera o envio.';
  if(/user not found/i.test(text))return 'Não foi possível localizar a conta. Confira o e-mail corporativo completo usado no convite. Se estiver correto, peça à Commet para verificar o cadastro; não é necessário criar outra conta.';
  if(/expired|invalid.*token|token.*invalid/i.test(text))return 'Este link de acesso expirou ou já foi utilizado. Solicite um novo link de recuperação. No primeiro acesso, use o convite mais recente.';
  if(error?.status===400||error?.status===401)return context==='recovery'?'Não foi possível enviar a recuperação. Confira o e-mail usado no convite e tente novamente mais tarde.':'Não foi possível entrar. Confira o e-mail e a senha ou use a recuperação de acesso.';
  return text||'Não foi possível concluir. Tente novamente.';
}
