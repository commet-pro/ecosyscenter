import {app} from '../../server/netlify-runtime.mjs';
export default req=>app().market.catalog(req);
export const config={path:'/public/catalog',method:'GET'};
