export function validatePassword(password){
  if(typeof password!=='string'||password.length<12||password.length>128)throw Error('Use uma senha de 12 a 128 caracteres.');
  return password;
}
export async function replacePassword(admin,user,password,temporary=false){
  validatePassword(password);
  return admin.updateUser(user.id,{password,confirm:true,app_metadata:{...user.appMetadata,must_change_password:temporary}});
}
