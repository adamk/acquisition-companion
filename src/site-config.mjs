import {canonicalUrl} from './lib/behavior.mjs';
import {supportEmail} from './lib/paid-product.mjs';
/** The only brand, domain, contact, analytics and source-display configuration. */
export const siteConfig = {
  name: 'Acquisition Companion',
  subtitle: 'The free, source-linked guide to buying, financing, and building businesses.',
  canonicalDomain: process.env.SITE_URL || '',
  contactEmail: supportEmail,
  analytics: {measurementId: process.env.PUBLIC_GA_MEASUREMENT_ID || ''},
  collections: {
    'yusufa-sey': {name: 'Yusufa Sey', description: 'Practitioner education on business acquisitions and financing.', url: '/sources/yusufa-sey/'},
    'fund-launch': {name: 'Fund Launch', description: 'Public educational guides on capital providers and private funds.', url: '/sources/fund-launch/'},
  },
};
// Fail early rather than emit a malformed canonical or invent a permanent domain.
canonicalUrl(siteConfig.canonicalDomain,'/');
