import {app} from '../../server/netlify-runtime.mjs';
export default ()=>app().scheduled();
export const config={schedule:'0 * * * *'};
