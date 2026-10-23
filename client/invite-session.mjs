// Identity 2.0 accepts invitations in browser storage but does not write the
// server authentication cookies in acceptInvite(). Establish them with login
// before requesting any protected page or API.
export async function completeInvite(token,password,{acceptInvite,login}){
  const user=await acceptInvite(token,password);
  return login(user.email,password);
}
