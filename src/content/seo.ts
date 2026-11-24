import { publicPages } from './publicPages.ts';

export const productOrigin = 'https://giantpay.mw';
const otherPublicPages: Record<string, { title: string; description: string }> = {
  '/pricing': {
    title: 'Sandbox payment pricing',
    description:
      'Review GiantPay sandbox collection fee calculations. Production pricing and acceptance require approved provider terms.',
  },
  '/privacy': {
    title: 'Privacy policy',
    description:
      'Read GiantPay’s privacy information for its payment gateway and merchant sandbox.',
  },
  '/terms': {
    title: 'Terms of use',
    description: 'Read the terms for using GiantPay’s payment gateway and sandbox tools.',
  },
  '/status': {
    title: 'Sandbox service status',
    description:
      'Check GiantPay sandbox service health. This is not production provider acceptance.',
  },
};
for (const [slug, title] of [
  ['overview', 'Payment integration for Malawi'],
  ['api-documentation', 'Sandbox payment API documentation'],
  ['collections-api', 'Collections API'],
  ['disbursements-api', 'Disbursements API readiness'],
  ['webhooks-api', 'Payment webhook integration'],
  ['sandbox', 'Payment sandbox'],
] as const) {
  otherPublicPages[`/developers/${slug}`] = {
    title,
    description: `${title} with GiantPay. Explore documented sandbox flows and backend confirmation; live payments and payouts remain disabled.`,
  };
}
export const seoPages = { ...otherPublicPages, ...publicPages };
export function pageMetadata(path: string, staff = false) {
  const content = staff ? undefined : seoPages[path];
  return content
    ? {
        title: `${content.title} | GiantPay`,
        description: content.description,
        canonical: productOrigin + path,
        robots: 'index,follow',
      }
    : {
        title: 'GiantPay secure workspace',
        description: 'GiantPay private workspace and checkout.',
        canonical: null,
        robots: 'noindex,nofollow,noarchive',
      };
}
export const organizationData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${productOrigin}/#organization`,
      name: 'GiantPlus',
      url: 'https://giantplus-mw.com',
      email: 'info@giantplus-mw.com',
      brand: { '@type': 'Brand', name: 'GiantPay', logo: `${productOrigin}/giantpay-logo.png` },
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Area 46',
        addressLocality: 'Lilongwe',
        addressCountry: 'MW',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${productOrigin}/#website`,
      name: 'GiantPay',
      url: productOrigin,
      publisher: { '@id': `${productOrigin}/#organization` },
    },
  ],
};
