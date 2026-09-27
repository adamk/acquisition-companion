import {canonicalUrl} from './lib/behavior.mjs';
/** The only brand, domain, contact, analytics and source-display configuration. */
export const siteConfig = {
  name: 'Acquisition Companion',
  subtitle: 'The free, source-linked guide to buying, financing, and building businesses.',
  canonicalDomain: process.env.SITE_URL || '',
  contactEmail: '',
  analytics: {enabled: false, provider: 'cloudflare', token: ''},
  collections: {
    'yusufa-sey': {name: 'Yusufa Sey', description: 'Practitioner education on business acquisitions and financing.', url: '/sources/yusufa-sey/'},
  },
};
// Fail early rather than emit a malformed canonical or invent a permanent domain.
canonicalUrl(siteConfig.canonicalDomain,'/');
