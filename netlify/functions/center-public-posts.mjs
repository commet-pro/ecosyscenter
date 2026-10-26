import {app} from '../../server/netlify-runtime.mjs';
export default req=>app().publicPosts(req);
export const config={path:'/public/posts',method:'GET'};
