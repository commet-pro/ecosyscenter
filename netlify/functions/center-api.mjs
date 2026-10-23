import {app} from '../../server/netlify-runtime.mjs';
export default (req,context)=>app().api(req,context);
export const config={path:'/api/*',excludedPath:'/api/session',rateLimit:{action:'rate_limit',windowLimit:60,windowSize:60,aggregateBy:['ip']}};
