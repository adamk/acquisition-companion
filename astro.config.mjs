import {defineConfig} from 'astro/config';
import {siteConfig} from './src/site-config.mjs';
export default defineConfig({
  output:'static',
  site:siteConfig.canonicalDomain || undefined,
  trailingSlash:'always',
  build:{format:'directory'},
  vite:{build:{sourcemap:false}},
});
