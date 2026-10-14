import {app} from '../../server/netlify-runtime.mjs';
export default req=>app().worker(req);
