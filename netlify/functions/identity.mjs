import {members} from '../../server/login-policy.mjs';
const allowed=user=>members(process.env).find(m=>m.email.toLowerCase()===user.email?.toLowerCase()&&m.active!==false);
export default {
  userValidate(event){if(!allowed(event.user))return event.deny();},
  userLogin(event){if(!allowed(event.user))return event.deny();},
  userSignup(event){
    const account=allowed(event.user);if(!account)return event.deny();
    // Roles enter the JWT on the next login or token refresh, not immediately.
    return {user:{...event.user,appMetadata:{...event.user.appMetadata,roles:account.roles}}};
  }
};
