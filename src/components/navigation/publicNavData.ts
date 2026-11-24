export interface NavItem {
  label: string;
  to: string;
  description?: string;
  badge?: 'Planned';
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
        label: 'QR Payments',
        to: '/products/qr-payments',
        description: 'Create, display, download and print merchant QR checkout',
      },
      {
        label: 'Merchant Devices',
        to: '/products/merchant-devices',
        description: 'QR displays and contactless integration readiness',
      },
      {
        label: 'Currency Exchange Demo',
        to: '/products/currency-exchange',
        description: 'Synthetic quotes only; exchange execution disabled',
      },
      {
        label: 'Payment Gateway',
        to: '/products/gateway',
        description: 'Core unified payment gateway for Malawian commerce',
      },
      {
        label: 'Collections',
        to: '/products/collections',
        description: 'Automated invoice and transaction collections',
      },
      {
        label: 'Payment Links',
        to: '/products/payment-links',
        description: 'Share checkout links for sandbox testing',
      },
      {
        label: 'Hosted Checkout',
        to: '/products/hosted-checkout',
        description: 'Secure, brand-aligned checkout flow with built-in channels',
      },
      {
        label: 'Disbursements',
        to: '/products/disbursements',
        description: 'Sandbox accounting records; real payouts disabled',
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
      },
      {
        label: 'API Documentation',
        to: '/developers/api-documentation',
        description: 'RESTful API specifications with cURL & TypeScript examples',
      },
      {
        label: 'Collections API',
        to: '/developers/collections-api',
        description: 'Initiate and manage programmatic payments',
      },
      {
        label: 'Disbursements API',
        to: '/developers/disbursements-api',
        description: 'Automate payouts with idempotent transaction control',
      },
      {
        label: 'Webhooks',
        to: '/developers/webhooks-api',
        description: 'Signed HMAC event delivery with delivery history logs',
      },
      {
        label: 'SDKs',
        to: '/developers/sdks',
        description: 'Official client libraries for modern languages',
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
      },
      {
        label: 'Card Payments',
        to: '/services/card-payments',
        description: 'Visa and Mastercard transaction processing',
      },
      {
        label: 'Bank Transfers',
        to: '/services/bank-transfers',
        description: 'National Switch and direct interbank clearance',
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
        description: 'Contact GiantPlus in Area 46, Lilongwe',
      },
      {
        label: 'Careers',
        to: '/company/careers',
        description: 'Join the engineering and product team building GiantPay',
      },
    ],
  },
];
