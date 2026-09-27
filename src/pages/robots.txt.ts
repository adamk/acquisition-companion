import {siteConfig} from '../site-config.mjs';
export function GET(){return new Response(siteConfig.canonicalDomain?`User-agent: *\nAllow: /\nSitemap: ${siteConfig.canonicalDomain.replace(/\/$/,'')}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}});}
