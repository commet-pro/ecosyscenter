import {app} from '../../server/netlify-runtime.mjs';
export default req=>app().market.authorizeCallback(req);
export const config={path:'/integrations/mercadolivre/callback',method:'GET'};
