import {app} from '../../server/netlify-runtime.mjs';
export default req=>app().blog(req);
export const config={path:['/blog','/blog/*','/sitemap.xml','/robots.txt']};
