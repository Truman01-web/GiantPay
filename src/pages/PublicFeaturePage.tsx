import { Link, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Code2,
  Cpu,
  Zap,
  ArrowRight,
  QrCode,
  Smartphone,
  CreditCard,
  Lock,
} from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { RotatingOrbitalLogos } from '@/components/marketing/RotatingOrbitalLogos';

interface FeatureDetail {
  title: string;
  badge: string;
  tagline: string;
  overview: string;
  heroImage: string;
  heroImageFallback?: string;
  keyBenefits: { title: string; desc: string }[];
  technicalSpecs: { label: string; value: string }[];
  codeExample?: { title: string; code: string };
  metrics: { value: string; label: string }[];
}

const FEATURE_CATALOG: Record<string, FeatureDetail> = {
  gateway: {
    title: 'Unified Payment Gateway',
    badge: 'Core Infrastructure',
    tagline: 'Connect all Malawian payment rails through a single, resilient integration.',
    heroImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80',
    overview:
      'The GiantPay Payment Gateway eliminates the complexity of integrating separately with Airtel Money, TNM Mpamba, Visa, Mastercard, and commercial banks. With intelligent failover routing, real-time transaction telemetry, and millisecond callback delivery, your business never drops a sale.',
    keyBenefits: [
      {
        title: 'Single Unified REST API',
        desc: 'One endpoint initiates checkout across mobile money, cards, and bank transfer without vendor lock-in.',
      },
      {
        title: 'Intelligent Channel Routing',
        desc: 'Automatic gateway health probing and intelligent retries prevent downtime during telco provider maintenance.',
      },
      {
        title: 'Instant Cryptographic Webhooks',
        desc: 'Receive HMAC-SHA256 signed payment confirmations the second funds clear on provider networks.',
      },
      {
        title: 'Automated Ledger Matching',
        desc: 'Every transaction is stamped with immutable timestamps and matched against provider settlement files.',
      },
    ],
    technicalSpecs: [
      { label: 'Latency', value: '< 220ms median' },
      { label: 'Payload Format', value: 'JSON / REST' },
      { label: 'Uptime SLA', value: '99.95% Target' },
      { label: 'Idempotency', value: 'Supported via Idempotency-Key' },
    ],
    codeExample: {
      title: 'Initiate Unified Payment Session',
      code: `curl -X POST https://api.giantpay.mw/v1/checkout/sessions \\
  -H "Authorization: Bearer sec_live_9a7d3f8..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 3500000,
    "currency": "MWK",
    "customer": {
      "email": "customer@business.mw",
      "phone": "+265991234567"
    },
    "channels": ["AIRTEL_MONEY", "TNM_MPAMBA", "CARD"]
  }'`,
    },
    metrics: [
      { value: '5+', label: 'Integrated Channels' },
      { value: '99.95%', label: 'Gateway Reliability' },
      { value: 'MWK', label: 'Native Currency' },
    ],
  },
  collections: {
    title: 'Automated Collections',
    badge: 'Merchant Operations',
    tagline: 'Streamline recurring customer billing, invoice collections, and digital receipts.',
    heroImage: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2000&q=80',
    overview:
      'GiantPay Collections automates revenue collection for schools, utilities, SACCOs, and recurring subscription services in Malawi. Automatically request wallet debits, track outstanding receivables, and trigger real-time receipts via SMS and email.',
    keyBenefits: [
      {
        title: 'Prompt-Based Wallet Debits',
        desc: 'Send USSD push notifications directly to customers phones for one-tap PIN authorization.',
      },
      {
        title: 'Smart Invoice Reminders',
        desc: 'Automated SMS and email reminders with one-click payment links for overdue balances.',
      },
      {
        title: 'Live Reconciliation Feeds',
        desc: 'Automatically flag customer invoices as paid the instant settlement clears.',
      },
      {
        title: 'Bulk Invoicing',
        desc: 'Upload CSV schedules to collect hundreds of school fees or subscription dues simultaneously.',
      },
    ],
    technicalSpecs: [
      { label: 'Channels', value: 'Airtel Money, TNM Mpamba, Bank' },
      { label: 'Trigger Mode', value: 'On-Demand & Scheduled' },
      { label: 'Notification', value: 'SMS, Webhook & Email' },
      { label: 'Export', value: 'CSV, Excel, PDF' },
    ],
    metrics: [
      { value: '94%', label: 'Collection Success' },
      { value: '< 15s', label: 'Push Settlement' },
      { value: '0 MWK', label: 'Setup Fees' },
    ],
  },
  'payment-links': {
    title: 'No-Code Payment Links',
    badge: 'Instant Commerce',
    tagline: 'Create shareable payment links in 10 seconds and accept payments anywhere.',
    heroImage: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Sell products, accept donations, or invoice clients without writing a single line of code. Generate branded payment links directly from your GiantPay dashboard and share them on WhatsApp, Facebook, Instagram, SMS, or email.',
    keyBenefits: [
      {
        title: 'Zero Development Required',
        desc: 'Create single-use or reusable payment links in seconds with custom amounts and item descriptions.',
      },
      {
        title: 'Mobile-Optimized Checkout',
        desc: 'Fast, responsive checkout pages engineered to load instantly even on 3G cellular connections.',
      },
      {
        title: 'Brand Alignment',
        desc: 'Customize link pages with your business name, logo, custom thank-you message, and redirect URL.',
      },
      {
        title: 'Instant Verification Alerts',
        desc: 'Receive immediate SMS and email notifications with customer phone number and transaction reference.',
      },
    ],
    technicalSpecs: [
      { label: 'Link Expiry', value: 'Customizable (1 hour to Never)' },
      { label: 'Usage Limits', value: 'Single or Multi-use' },
      { label: 'Redirects', value: 'Custom URL supported' },
      { label: 'Branding', value: 'Logo & Colors' },
    ],
    metrics: [
      { value: '10s', label: 'Creation Time' },
      { value: '100%', label: 'No Code Required' },
      { value: '24/7', label: 'Live Acceptance' },
    ],
  },
  'hosted-checkout': {
    title: 'Hosted Checkout Experience',
    badge: 'Conversion Engine',
    tagline: 'A seamless, trustworthy checkout page engineered for Malawian buyers.',
    heroImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: '/hero-bg.jpg',
    overview:
      'Maximize payment conversion with GiantPay Hosted Checkout. Pre-built with channel tabs for Airtel Money, TNM Mpamba, Visa, Mastercard, and National Switch transfers, protected by PCI-DSS security controls and responsive across all screens.',
    keyBenefits: [
      {
        title: 'All Local Payment Channels',
        desc: 'Customers choose their preferred payment method without leaving your branded flow.',
      },
      {
        title: 'Instant Push Prompts',
        desc: 'Mobile money customers receive automatic USSD prompt on their handset with transaction amount.',
      },
      {
        title: 'Fraud & Duplicate Protection',
        desc: 'Built-in double-charge protection and tokenized card handling keeps checkout safe.',
      },
      {
        title: 'Custom Brand Styling',
        desc: 'Matches your business identity with merchant logos, color accents, and transparent callbacks.',
      },
    ],
    technicalSpecs: [
      { label: 'Integration', value: 'Redirect or Modal Iframe' },
      { label: 'Security', value: 'PCI-DSS & 3D Secure 2.0' },
      { label: 'Localization', value: 'English & Chichewa' },
      { label: 'Callbacks', value: 'Synchronous + Webhook' },
    ],
    metrics: [
      { value: '99.4%', label: 'Checkout Uptime' },
      { value: '< 2s', label: 'Page Load' },
      { value: '1.8%', label: 'Flat Fee' },
    ],
  },
  disbursements: {
    title: 'Automated Disbursements & Payouts',
    badge: 'Enterprise Payouts',
    tagline: 'Disburse funds at scale to thousands of mobile wallets and bank accounts in minutes.',
    heroImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Whether paying staff salaries, agent commissions, farmer stipends, or supplier invoices, GiantPay Disbursements automates mass payouts across Malawi. Send single transfers via API or upload bulk payment batches via dashboard.',
    keyBenefits: [
      {
        title: 'Multi-Rail Payouts',
        desc: 'Send payouts simultaneously to Airtel Money, TNM Mpamba, and all major commercial banks.',
      },
      {
        title: 'Dual Approval Controls (Maker-Checker)',
        desc: 'Enforce enterprise security where one team member drafts payouts and a designated manager approves.',
      },
      {
        title: 'Real-Time Delivery Verification',
        desc: 'Track the delivery state of every transfer in real-time with automatic retry on transient provider network errors.',
      },
      {
        title: 'Accounting Export',
        desc: 'Download reconciliation spreadsheets with beneficiary phone, bank account, and transaction reference.',
      },
    ],
    technicalSpecs: [
      { label: 'Batch Size', value: 'Up to 5,000 per file' },
      { label: 'Execution', value: 'Automated & Scheduled' },
      { label: 'Approval', value: 'Maker-Checker workflow' },
      { label: 'Settlement', value: 'Immediate to Wallets' },
    ],
    metrics: [
      { value: '5,000', label: 'Batch Capacity' },
      { value: 'Instant', label: 'Wallet Delivery' },
      { value: 'T+1', label: 'Bank Delivery' },
    ],
  },
  'online-payments': {
    title: 'E-Commerce Online Payments',
    badge: 'Digital Commerce',
    tagline: 'Seamless checkout solutions for websites, mobile apps, and online storefronts.',
    heroImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Turn visitors into paying customers with streamlined e-commerce integration. Compatible with standard web technologies, plugins, and custom application backends.',
    keyBenefits: [
      {
        title: 'Plug & Play Integration',
        desc: 'Fast onboarding for web shops, mobile apps, and booking platforms.',
      },
      {
        title: 'Responsive Mobile Experience',
        desc: 'Optimized touch interfaces for Android and iOS mobile shoppers.',
      },
      {
        title: 'Real-Time Order Confirmation',
        desc: 'Instant webhooks update your shopping cart database and dispatch confirmation emails.',
      },
      {
        title: 'Comprehensive Merchant Dashboard',
        desc: 'Filter, inspect, and analyze incoming orders and payment performance in real time.',
      },
    ],
    technicalSpecs: [
      { label: 'Platforms', value: 'Web, iOS, Android' },
      { label: 'Protocols', value: 'HTTPS / TLS 1.3' },
      { label: 'APIs', value: 'REST JSON' },
      { label: 'Plugins', value: 'SDKs & API Keys' },
    ],
    metrics: [
      { value: '3x', label: 'Faster Checkout' },
      { value: '0 MWK', label: 'Maintenance Fee' },
      { value: '100%', label: 'Audit Trail' },
    ],
  },
  'mobile-money': {
    title: 'Airtel Money & TNM Mpamba Wallets',
    badge: 'Mobile Money Integration',
    tagline: 'Direct connectivity to the two dominant mobile money networks in Malawi.',
    heroImage: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Over 85% of digital payments in Malawi originate from mobile wallets. GiantPay integrates directly with both Airtel Money and TNM Mpamba, providing customers with instant prompt-based wallet debit experiences without USSD dialing friction.',
    keyBenefits: [
      {
        title: 'Airtel Money Express',
        desc: 'Direct integration with Airtel Malawi mobile commerce infrastructure for automatic push alerts.',
      },
      {
        title: 'TNM Mpamba Push',
        desc: 'Instant USSD authorization push directly to TNM subscriber handsets across Malawi.',
      },
      {
        title: 'Unified Callback Normalization',
        desc: 'One standardized webhook payload format regardless of whether Airtel or TNM is used.',
      },
      {
        title: 'Automated Reversals & Refunds',
        desc: 'Programmatically refund mobile wallet payments directly to customer phone numbers with full audit trail.',
      },
    ],
    technicalSpecs: [
      { label: 'Airtel API', value: 'Direct Enterprise Integration' },
      { label: 'TNM API', value: 'Direct Gateway Integration' },
      { label: 'Currency', value: 'Malawi Kwacha (MWK)' },
      { label: 'Settlement', value: 'T+1 Commercial Bank' },
    ],
    metrics: [
      { value: '8M+', label: 'Reachable Subscribers' },
      { value: '< 10s', label: 'Average Push Speed' },
      { value: '99.8%', label: 'Delivery Uptime' },
    ],
  },
  'card-payments': {
    title: 'Visa & Mastercard Card Processing',
    badge: 'Card Infrastructure',
    tagline: 'Accept local and international Visa and Mastercard payments securely.',
    heroImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Enable your business to accept domestic Malawian debit cards and international cards. Backed by 3D-Secure 2.0 authentication, end-to-end tokenization, and multi-currency conversion.',
    keyBenefits: [
      {
        title: 'Domestic & International Acceptance',
        desc: 'Accept Visa and Mastercard issued by Malawian banks as well as foreign travelers and overseas buyers.',
      },
      {
        title: '3D Secure 2.0 (EMVCo)',
        desc: 'Frictionless customer authentication protects merchants against fraudulent chargebacks.',
      },
      {
        title: 'Tokenized Vaulting',
        desc: 'Card details never touch your server, fulfilling strict PCI-DSS compliance effortlessly.',
      },
      {
        title: 'Real-Time Risk Scoring',
        desc: 'Machine learning fraud filters score every transaction before authorization.',
      },
    ],
    technicalSpecs: [
      { label: 'Supported Cards', value: 'Visa, Mastercard' },
      { label: 'Authentication', value: '3D Secure 2.0 OTP' },
      { label: 'Compliance', value: 'PCI-DSS Tier 1 Ready' },
      { label: 'Settlement', value: 'T+1 Commercial Bank' },
    ],
    metrics: [
      { value: '100%', label: 'PCI Compliant' },
      { value: '3DS 2.0', label: 'Chargeback Protection' },
      { value: 'Global', label: 'Coverage' },
    ],
  },
  'bank-transfers': {
    title: 'National Switch & Bank Transfers',
    badge: 'Interbank Settlement',
    tagline: 'Direct high-value electronic bank transfers through Malawi National Switch.',
    heroImage: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80',
    overview:
      'For larger transactions, business-to-business payments, and corporate accounts, GiantPay connects to the National Switch clearing network, providing automated reference generation and payment matching.',
    keyBenefits: [
      {
        title: 'High Transaction Limits',
        desc: 'Suitable for wholesale orders, school tuition, corporate invoices, and high-ticket sales.',
      },
      {
        title: 'Dynamic Reference Matching',
        desc: 'Every bank transfer carries a unique payment reference for zero-error automated reconciliation.',
      },
      {
        title: 'All Malawian Banks Supported',
        desc: 'National Bank, Standard Bank, FDH Bank, NBS Bank, Centenary Bank, First Capital Bank, and CDH.',
      },
      {
        title: 'Direct Account Settlement',
        desc: 'Funds clear directly into your business merchant account.',
      },
    ],
    technicalSpecs: [
      { label: 'Network', value: 'Malawi National Switch' },
      { label: 'Clearing Time', value: 'Same Day / T+1' },
      { label: 'Matching', value: 'Virtual Reference Stamping' },
      { label: 'Ledger Audit', value: 'Immutable Double-Entry' },
    ],
    metrics: [
      { value: '7+', label: 'Commercial Banks' },
      { value: 'High', label: 'Transaction Limits' },
      { value: '100%', label: 'Reference Accuracy' },
    ],
  },
  'merchant-tools': {
    title: 'Reconciliation & Financial Tools',
    badge: 'Financial Ledger',
    tagline: 'Automated double-entry accounting, settlement statements, and ledger audit reports.',
    heroImage: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Say goodbye to reconciling spreadsheets by hand. GiantPay automatically synchronizes transaction records across all mobile money operators and acquiring banks, producing instant tax-ready reports and exception audits.',
    keyBenefits: [
      {
        title: 'Automated Daily Reconciliation',
        desc: 'Matches incoming payments with provider statements and highlights any settlement discrepancy.',
      },
      {
        title: 'Audit-Ready Reports',
        desc: 'Export detailed financial statements in CSV, Excel, and PDF formats for internal finance teams and auditors.',
      },
      {
        title: 'Role-Based Team Permissions',
        desc: 'Grant custom dashboard permissions for accountants, developers, customer support, and administrators.',
      },
      {
        title: 'Real-Time Financial Telemetry',
        desc: 'Track gross payment volume, success rates, average ticket size, and net earnings in real time.',
      },
    ],
    technicalSpecs: [
      { label: 'Ledger Model', value: 'Immutable Double-Entry' },
      { label: 'Export Format', value: 'CSV, XLSX, PDF, JSON' },
      { label: 'Frequency', value: 'Real-Time & Batch' },
      { label: 'Audit Trail', value: 'Tamper-Evident Logs' },
    ],
    metrics: [
      { value: '0 hrs', label: 'Manual Reconciliation' },
      { value: '100%', label: 'Ledger Accuracy' },
      { value: '24/7', label: 'Telemetry Monitoring' },
    ],
  },
  guides: {
    title: 'Integration Guides & Walkthroughs',
    badge: 'Developer Resources',
    tagline: 'Step-by-step guides to integrate GiantPay into web shops, mobile apps, and billing platforms.',
    heroImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Explore full end-to-end integration walkthroughs with code snippets in Node.js, PHP, Python, and cURL. Learn how to handle webhook events, verify signatures, and automate settlement checks.',
    keyBenefits: [
      {
        title: 'Copy-Paste Code Samples',
        desc: 'Functional, tested code snippets for popular frameworks including React, Next.js, Laravel, and Django.',
      },
      {
        title: 'Webhook Verification',
        desc: 'Detailed guides on validating HMAC-SHA256 signatures to ensure notifications originate strictly from GiantPay.',
      },
      {
        title: 'Error Handling Patterns',
        desc: 'Learn how to handle network timeouts, customer cancellation, and telecom balance limits gracefully.',
      },
      {
        title: 'Production Checklist',
        desc: 'Pre-flight requirements, KYC submission, and credentials swap checklist before receiving live customer money.',
      },
    ],
    technicalSpecs: [
      { label: 'Languages', value: 'Node.js, PHP, Python, cURL' },
      { label: 'SDK Support', value: 'Official Client Libraries' },
      { label: 'Format', value: 'Markdown & Interactive Guides' },
      { label: 'Updates', value: 'Synchronized with API v1' },
    ],
    metrics: [
      { value: '15 min', label: 'Average Setup Time' },
      { value: '4+', label: 'Supported Stacks' },
      { value: '100%', label: 'Test Coverage' },
    ],
  },
  help: {
    title: 'Merchant Care & Help Centre',
    badge: 'Support & FAQs',
    tagline: 'Dedicated merchant operations support, settlement guidance, and troubleshooting resources.',
    heroImage: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Access immediate answers to questions regarding onboarding requirements, account verification, transaction fees, bank payouts, and payment disputes.',
    keyBenefits: [
      {
        title: 'Direct Account Managers',
        desc: 'Enterprise merchants receive dedicated account support based in Lilongwe and Blantyre.',
      },
      {
        title: 'Settlement Resolution',
        desc: 'Quick escalation for delayed bank transfers or provider reconciliation adjustments.',
      },
      {
        title: 'KYC & KYB Guidance',
        desc: 'Assistance with document verification, TPIN registration, and business certification.',
      },
      {
        title: 'Developer Troubleshooting',
        desc: 'Technical engineers ready to inspect webhook delivery failures and API payload exceptions.',
      },
    ],
    technicalSpecs: [
      { label: 'Office Hours', value: 'Mon - Fri, 08:00 - 17:00 CAT' },
      { label: 'Hotline', value: '+265 881 933 960' },
      { label: 'Email', value: 'support@giantpay.mw' },
      { label: 'SLA', value: '< 2 Hours Response' },
    ],
    metrics: [
      { value: '< 2h', label: 'Average Response Time' },
      { value: '98%', label: 'Merchant Satisfaction' },
      { value: '2', label: 'Offices in Malawi' },
    ],
  },
  security: {
    title: 'Enterprise Security & Compliance',
    badge: 'Data Protection',
    tagline: 'Bank-grade encryption, PCI-DSS security standards, and strict regulatory controls.',
    heroImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Security is the foundational layer of GiantPay. Every transaction is guarded with cryptographic signatures, TLS 1.3 encryption, and machine learning fraud screening compliant with Reserve Bank of Malawi guidelines.',
    keyBenefits: [
      {
        title: 'End-to-End Encryption',
        desc: 'All data in transit is encrypted using TLS 1.3; sensitive ledger databases are secured with AES-256.',
      },
      {
        title: 'PCI-DSS Tier 1 Architecture',
        desc: 'Zero raw card data touches merchant servers; cards are tokenized into encrypted tokens.',
      },
      {
        title: 'Cryptographic HMAC Webhooks',
        desc: 'Every webhook carries an HMAC-SHA256 signature generated with your secret merchant key.',
      },
      {
        title: 'Strict RBM Regulatory Compliance',
        desc: 'Built in direct alignment with Reserve Bank of Malawi payment system and AML directives.',
      },
    ],
    technicalSpecs: [
      { label: 'Encryption', value: 'TLS 1.3 & AES-256' },
      { label: 'Card Compliance', value: 'PCI-DSS Tokenized' },
      { label: 'Webhook Signature', value: 'HMAC-SHA256' },
      { label: 'Audit Logs', value: 'Immutable Append-Only' },
    ],
    metrics: [
      { value: '256-bit', label: 'AES Encryption' },
      { value: '100%', label: 'Regulatory Alignment' },
      { value: 'Zero', label: 'Raw Card Storage' },
    ],
  },
  blog: {
    title: 'Fintech Insights & Engineering Blog',
    badge: 'Industry Dispatch',
    tagline: 'Stories, engineering articles, and market insights on digital payment adoption in Malawi.',
    heroImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80',
    overview:
      'Stay ahead of developments in Malawi’s payment landscape. Read in-depth analyses on mobile wallet adoption, National Switch advancements, and technical best practices for digital commerce.',
    keyBenefits: [
      {
        title: 'Market Trends',
        desc: 'Quarterly reports on payment volume shifts, mobile money penetration, and card adoption in Malawi.',
      },
      {
        title: 'Engineering Deep-Dives',
        desc: 'Technical articles on building distributed ledgers, handling idempotency, and achieving 99.95% uptime.',
      },
      {
        title: 'Merchant Case Studies',
        desc: 'Discover how schools, retailers, and utilities use GiantPay to eliminate reconciliation delays.',
      },
      {
        title: 'Regulatory Updates',
        desc: 'Clear summaries of Reserve Bank of Malawi notices affecting payment service providers and merchants.',
      },
    ],
    technicalSpecs: [
      { label: 'Frequency', value: 'Bi-Weekly Articles' },
      { label: 'Topics', value: 'Fintech, Engineering, RBM' },
      { label: 'Audience', value: 'Merchants & Developers' },
      { label: 'Access', value: 'Free Public Knowledge' },
    ],
    metrics: [
      { value: 'Bi-Weekly', label: 'Fresh Publications' },
      { value: '100%', label: 'Local Focus' },
      { value: 'Free', label: 'Open Access' },
    ],
  },
};

function FeatureHeroVisual({ slug }: { slug: string }) {
  if (slug === 'mobile-money') {
    return <RotatingOrbitalLogos type="mobile-money" />;
  }

  if (slug === 'card-payments') {
    return <RotatingOrbitalLogos type="card-payments" />;
  }

  if (slug === 'gateway') {
    return (
      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Unified Gateway Engine</span>
          </div>
          <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
            99.95% Uptime
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-800/80 p-3 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 font-bold text-xs">
                AM
              </div>
              <div>
                <p className="text-xs font-bold text-white">Airtel Money</p>
                <p className="text-[10px] text-slate-400">USSD Push Routing</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400">Active (120ms)</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-800/80 p-3 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                TM
              </div>
              <div>
                <p className="text-xs font-bold text-white">TNM Mpamba</p>
                <p className="text-[10px] text-slate-400">Instant Wallet Push</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400">Active (140ms)</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-800/80 p-3 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs">
                VM
              </div>
              <div>
                <p className="text-xs font-bold text-white">Visa &amp; Mastercard</p>
                <p className="text-[10px] text-slate-400">3D Secure 2.0</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400">Active (210ms)</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Failover Redundancy: Enabled</span>
          <span className="text-blue-400 font-medium">Single Endpoint</span>
        </div>
      </div>
    );
  }

  if (slug === 'collections') {
    return (
      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Customer Push Simulator</span>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
            Pending PIN
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
          <p className="text-xs text-emerald-300 font-medium">Automated Wallet Debit Request</p>
          <p className="mt-2 text-2xl font-black text-white">MWK 45,000</p>
          <p className="mt-1 text-xs text-slate-400">Monthly Utility &amp; Service Fee</p>

          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-xl bg-slate-800 py-2 text-xs font-semibold text-slate-300">
              Cancel
            </div>
            <div className="flex-1 rounded-xl bg-[#1B4FD8] py-2 text-xs font-bold text-white shadow-md">
              Authorize PIN
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>SMS Receipt Dispatched</span>
          <span className="text-emerald-400 font-medium">Automatic Matching</span>
        </div>
      </div>
    );
  }

  if (slug === 'payment-links') {
    return (
      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Shareable Payment Link</span>
          </div>
          <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
            Ready to Share
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-800/80 p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Kambaza Crafts Malawi</span>
            <span className="text-xs font-extrabold text-blue-400">MWK 18,500</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Handcrafted Table Decor (Ref: PL-9821)</p>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-mono text-slate-300">
            <span className="truncate">giantpay.mw/pay/pl_kambaza98</span>
            <span className="text-[#1B4FD8] font-bold cursor-pointer hover:underline ml-2">Copy</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-300">
            <span>Share WhatsApp</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 py-2 text-xs font-bold text-blue-300">
            <span>Share via SMS</span>
          </div>
        </div>
      </div>
    );
  }

  if (slug === 'hosted-checkout') {
    return (
      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">GiantPay Checkout</span>
          </div>
          <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
            PCI-DSS Certified
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex gap-2 text-center text-xs">
            <div className="flex-1 rounded-xl bg-[#1B4FD8] py-2 font-bold text-white shadow">
              Airtel
            </div>
            <div className="flex-1 rounded-xl bg-slate-800 py-2 font-medium text-slate-400">
              TNM
            </div>
            <div className="flex-1 rounded-xl bg-slate-800 py-2 font-medium text-slate-400">
              Card
            </div>
            <div className="flex-1 rounded-xl bg-slate-800 py-2 font-medium text-slate-400">
              Bank
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/70 p-3 border border-white/5">
            <p className="block text-[10px] font-bold uppercase text-slate-400">Phone Number</p>
            <p className="mt-1 text-sm font-semibold text-white">+265 99 123 4567</p>
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-extrabold text-white shadow-lg"
          >
            Pay MWK 25,000 Now
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Lock className="h-3 w-3 text-slate-500" />
          <span>Encrypted with 256-bit TLS 1.3</span>
        </div>
      </div>
    );
  }

  // Generic fallback visual showcase with brand mark
  return (
    <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-3 shadow-lg shadow-blue-500/30">
        <img src="/giantpay-mark.png" alt="GiantPay" className="h-full w-full object-contain" />
      </div>
      <h4 className="mt-4 text-lg font-bold text-white">GiantPay Infrastructure</h4>
      <p className="mt-1 text-xs text-slate-400">
        Unified payment processing and automated reconciliation across Malawi.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-white/10 text-left">
        <div className="rounded-xl bg-slate-800/80 p-3">
          <p className="text-xs font-bold text-white">MWK Native</p>
          <p className="text-[10px] text-slate-400">Zero FX Conversion Drag</p>
        </div>
        <div className="rounded-xl bg-slate-800/80 p-3">
          <p className="text-xs font-bold text-white">T+1 Settlement</p>
          <p className="text-[10px] text-slate-400">Direct Bank Payouts</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicFeaturePage() {
  const location = useLocation();
  const slug = location.pathname.split('/').filter(Boolean).pop() ?? 'gateway';

  // Lookup custom feature details or fallback
  const feature = FEATURE_CATALOG[slug] || {
    title: slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    badge: 'GiantPay Platform',
    tagline: 'Enterprise-grade payment infrastructure engineered for modern Malawian commerce.',
    heroImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2000&q=80',
    heroImageFallback: '/hero-bg.jpg',
    overview:
      'GiantPay provides unified integration infrastructure allowing businesses to accept payments across Airtel Money, TNM Mpamba, cards, and bank transfers with real-time settlement telemetry and developer tools.',
    keyBenefits: [
      {
        title: 'Unified Integration',
        desc: 'One seamless platform handles multiple channels with reliable fallback logic.',
      },
      {
        title: 'Fast Settlements',
        desc: 'Automated settlement schedules deliver funds directly to your verified commercial bank account.',
      },
      {
        title: 'Developer Friendly',
        desc: 'Complete REST APIs, sandboxes, and documentation to build custom payment flows.',
      },
      {
        title: 'Regulatory Compliance',
        desc: 'Designed under Reserve Bank of Malawi guidelines with robust AML/KYC verification.',
      },
    ],
    technicalSpecs: [
      { label: 'Availability', value: 'Developer Sandbox Live' },
      { label: 'Environment', value: 'Zero-Risk Test Mode' },
      { label: 'Currency', value: 'MWK (Malawi Kwacha)' },
      { label: 'Security', value: 'TLS 1.3 & HMAC' },
    ],
    metrics: [
      { value: '5+', label: 'Payment Channels' },
      { value: '1.8%', label: 'Competitive Fee' },
      { value: '24/7', label: 'Platform Support' },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Header */}
      <section className="relative overflow-hidden text-white pt-28 pb-16 sm:pt-36 sm:pb-20 bg-[#061428]">
        {/* Dedicated Background Photo with layered dark gradient overlay */}
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src={feature.heroImage}
            onError={(e) => {
              if (feature.heroImageFallback) e.currentTarget.src = feature.heroImageFallback;
            }}
            alt=""
            className="h-full w-full object-cover object-center opacity-30 sm:opacity-35"
            style={{ filter: 'contrast(1.1) brightness(0.85)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061428] via-[#061428]/90 to-[#0B2445]/85" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#061428]/80 via-transparent to-[#061428]" />
        </div>
        <div aria-hidden className="grid-bg absolute inset-0 opacity-25 pointer-events-none" />
        <div aria-hidden className="hero-glow absolute inset-0 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <BackButton fallbackTo="/" label="Back" variant="glass" />
          </div>

          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Headline & Content */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-blue-300">
                  {feature.badge}
                </span>
              </div>

              <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                {feature.title}
              </h1>

              <p className="mt-4 max-w-2xl text-base sm:text-xl text-slate-300 leading-relaxed font-medium">
                {feature.tagline}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-700/25 transition hover:bg-[#1744b9]"
                >
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/developers/overview"
                  className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View API Documentation
                </Link>
              </div>

              {/* Key Metrics Strip */}
              <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-8 max-w-xl">
                {feature.metrics.map((m) => (
                  <div key={m.label}>
                    <p className="text-2xl sm:text-3xl font-black text-white">{m.value}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase (Rotating Logos on mobile-money & card-payments) */}
            <div className="lg:col-span-5 flex justify-center">
              <FeatureHeroVisual slug={slug} />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 space-y-12">
        {/* Overview Box */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 text-[#1B4FD8]">
            <Zap className="h-6 w-6" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Capability Overview</h2>
          </div>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">{feature.overview}</p>
        </div>

        {/* Benefits Grid */}
        <div>
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8]">Core Advantages</p>
            <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              Engineered for reliability &amp; speed
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {feature.keyBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-[#1B4FD8]/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1B4FD8]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{benefit.title}</h4>
                </div>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Specs & Code Preview */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Specifications Table */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="h-5 w-5 text-[#1B4FD8]" />
              <h3 className="text-lg font-bold text-slate-900">Technical Specifications</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {feature.technicalSpecs.map((spec) => (
                <div key={spec.label} className="py-3.5 flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">{spec.label}</span>
                  <span className="font-bold text-slate-900">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Code Example or Live Testing Widget */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-semibold text-slate-300">
                    {feature.codeExample?.title || 'Interactive Sandbox Test'}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  Ready to test
                </span>
              </div>
              <pre className="mt-4 overflow-x-auto text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
                <code>
                  {feature.codeExample?.code ||
                    `// Test payments in your developer environment
const giantpay = require('@giantpay/node')('sec_test_...');

const payment = await giantpay.charges.create({
  amount: 150000,
  currency: 'MWK',
  channel: 'AIRTEL_MONEY',
  phone: '+265991234567'
});

console.log(payment.status); // 'SUCCESS'`}
                </code>
              </pre>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Tested against Malawian telecom APIs</span>
              <Link
                to="/developers/sandbox"
                className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                Launch Sandbox <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Card */}
        <div className="rounded-3xl bg-gradient-to-r from-[#1B4FD8] to-blue-700 p-8 sm:p-12 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Start integrating {feature.title} today
            </h3>
            <p className="mt-2 text-sm sm:text-base text-blue-100 max-w-xl leading-relaxed">
              Create your free sandbox merchant account, get immediate API credentials, and simulate live transactions.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              to="/register"
              className="rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#1B4FD8] shadow-md transition hover:bg-slate-100 text-center"
            >
              Sign Up Free
            </Link>
            <Link
              to="/company/contact"
              className="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20 text-center"
            >
              Talk to Sales
            </Link>
          </div>
        </div>

        {/* Bottom Back Navigation */}
        <div className="pt-4 flex justify-between items-center border-t border-slate-200">
          <BackButton fallbackTo="/" label="Back to Overview" variant="dark" />
          <Link
            to="/pricing"
            className="text-sm font-bold text-[#1B4FD8] hover:text-[#1744b9] inline-flex items-center gap-1.5"
          >
            <span>View Pricing</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
