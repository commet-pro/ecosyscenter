import {build} from 'esbuild';
await build({entryPoints:['client/identity.mjs'],outfile:'assets/identity.bundle.js',bundle:true,minify:true,platform:'browser',target:['es2022'],format:'iife',legalComments:'eof'});
