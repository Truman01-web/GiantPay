export interface NavItem {
  label: string;
  to: string;
  description?: string;
  badge?: 'Planned' | 'Coming soon';
}

export interface NavGroup {
  label: string;
  to?: string; // If it's a direct link (e.g. Pricing)
  items?: NavItem[];
}

export const PUBLIC_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Products',
    items: [
      {
        label: 'Payment Gateway',
        to: '/products/gateway',
        description: 'Core unified payment gateway for Malawian commerce',
        badge: 'Planned',
      },
      {
        label: 'Collections',
        to: '/products/collections',
        description: 'Automated invoice and transaction collections',
        badge: 'Planned',
      },
      {
        label: 'Payment Links',
        to: '/products/payment-links',
        description: 'Shareable no-code links for immediate acceptance',
      },
      {
        label: 'Hosted Checkout',
        to: '/products/hosted-checkout',
        description: 'Secure, brand-aligned checkout flow with built-in channels',
      },
      {
        label: 'Disbursements',
        to: '/products/disbursements',
        description: 'Bulk payouts to mobile wallets and bank accounts',
        badge: 'Planned',
      },
    ],
  },
  {
    label: 'Pricing',
    to: '/pricing',
  },
  {
    label: 'Developers',
    items: [
      {
        label: 'Developer Overview',
        to: '/developers/overview',
        description: 'Architecture, sandbox testing, and quickstart guides',
        badge: 'Coming soon',
      },
      {
        label: 'API Documentation',
        to: '/developers/api-documentation',
        description: 'RESTful API specifications with cURL & TypeScript examples',
        badge: 'Coming soon',
      },
      {
        label: 'Collections API',
        to: '/developers/collections-api',
        description: 'Initiate and manage programmatic payments',
        badge: 'Planned',
      },
      {
        label: 'Disbursements API',
        to: '/developers/disbursements-api',
        description: 'Automate payouts with idempotent transaction control',
        badge: 'Planned',
      },
      {
        label: 'Webhooks',
        to: '/developers/webhooks-api',
        description: 'Signed HMAC event delivery with delivery history logs',
        badge: 'Coming soon',
      },
      {
        label: 'SDKs',
        to: '/developers/sdks',
        description: 'Official client libraries for modern languages',
        badge: 'Planned',
      },
      {
        label: 'Sandbox',
        to: '/developers/sandbox',
        description: 'Zero-risk test environment with simulated telemetry',
      },
      {
        label: 'API Status',
        to: '/status',
        description: 'Sandbox uptime, latency metrics, and operational health',
      },
    ],
  },
  {
    label: 'Services',
    items: [
      {
        label: 'Online Payments',
        to: '/services/online-payments',
        description: 'E-commerce and web application checkout integration',
      },
      {
        label: 'Mobile Money',
        to: '/services/mobile-money',
        description: 'Airtel Money and TNM Mpamba wallet support',
        badge: 'Planned',
      },
      {
        label: 'Card Payments',
        to: '/services/card-payments',
        description: 'Visa and Mastercard transaction processing',
        badge: 'Planned',
      },
      {
        label: 'Bank Transfers',
        to: '/services/bank-transfers',
        description: 'National Switch and direct interbank clearance',
        badge: 'Planned',
      },
      {
        label: 'Merchant Tools',
        to: '/services/merchant-tools',
        description: 'Reconciliation, reporting, and merchant dashboard',
      },
    ],
  },
  {
    label: 'Resources',
    items: [
      {
        label: 'Integration Guides',
        to: '/resources/guides',
        description: 'Step-by-step implementation walkthroughs',
      },
      {
        label: 'Help Centre',
        to: '/resources/help',
        description: 'Frequently asked questions and merchant support',
      },
      {
        label: 'Security',
        to: '/resources/security',
        description: 'Data encryption, compliance, and infrastructure standards',
      },
      {
        label: 'Blog',
        to: '/resources/blog',
        description: 'Fintech insights and engineering updates in Malawi',
        badge: 'Planned',
      },
      {
        label: 'System Status',
        to: '/status',
        description: 'Sandbox service health and maintenance notices',
      },
    ],
  },
  {
    label: 'Company',
    items: [
      {
        label: 'About GiantPay',
        to: '/company/about',
        description: 'Our mission to modernize digital payments in Malawi',
      },
      {
        label: 'About GiantPlus',
        to: '/company/giantplus',
        description: 'Global Finance Solutions group parent company',
      },
      {
        label: 'Compliance',
        to: '/company/compliance',
        description: 'Regulatory alignment, AML/KYC policies, and audits',
      },
      {
        label: 'Contact',
        to: '/company/contact',
        description: 'Speak with our Lilongwe and Blantyre merchant team',
      },
      {
        label: 'Careers',
        to: '/company/careers',
        description: 'Join the engineering and product team building GiantPay',
        badge: 'Planned',
      },
    ],
  },
];
