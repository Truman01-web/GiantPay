export interface PublicPage {
  title: string;
  description: string;
  eyebrow: string;
  sections: { title: string; text: string }[];
}

const page = (
  title: string,
  description: string,
  eyebrow: string,
  sections: [string, string][],
): PublicPage => ({
  title,
  description,
  eyebrow,
  sections: sections.map(([title, text]) => ({ title, text })),
});

export const publicPages: Record<string, PublicPage> = {
  '/': page(
    'Payment gateway for Malawian businesses',
    'GiantPay by GiantPlus brings online payments, merchant QR checkout and payment integration into one sandbox for businesses in Malawi.',
    'Built for Malawi',
    [
      [
        'One place to manage merchant payments',
        'Create payment links and QR codes, follow backend-confirmed payment states, and review transaction and ledger records. Test the journey in the sandbox before considering production activation.',
      ],
      [
        'Start with a link. Grow with an integration.',
        'Share a hosted checkout link, display a counter QR code, or explore the API documentation. Merchant and staff workspaces keep their existing permission controls.',
      ],
      [
        'Know what is available',
        'Local sandbox checkout and merchant tools are available for testing. Live collections, payouts, terminal card acceptance and currency exchange execution are disabled or await provider approval.',
      ],
    ],
  ),
  '/products/gateway': page(
    'Payment gateway Malawi',
    'Explore GiantPay’s sandbox payment gateway for Malawian businesses: hosted checkout, payment links, QR payments and backend verification.',
    'Sandbox available',
    [
      [
        'Bring checkout into your business',
        'Create a payment link or QR target in the merchant workspace. Customers open hosted checkout and select a configured sandbox method. Real mobile money, card and bank acceptance depend on provider access and approval.',
      ],
      [
        'Confirm before fulfilling',
        'A checkout submission or redirect is not proof of payment. Read the trusted backend payment status and confirm the reference, currency and amount before fulfilling an order.',
      ],
      [
        'Keep transaction evidence together',
        'The existing ledger, transaction history and reconciliation tools support sandbox operations. No production uptime, certification or settlement guarantee is claimed.',
      ],
    ],
  ),
  '/products/qr-payments': page(
    'QR payments for merchants in Malawi',
    'Create, display, download and print GiantPay merchant QR codes. Customers scan an HTTPS checkout link; the backend confirms payment.',
    'Scan-to-Pay · Sandbox',
    [
      [
        'Merchant: create your QR',
        'Sign in to the merchant workspace and open Scan to Pay. Choose a fixed amount or customer-entered amount, set minimum and maximum limits as needed, and configure expiry and successful-payment limits. Merchant permissions govern creation and revocation.',
      ],
      [
        'Display, download or print',
        'Display the QR on a screen, download a PNG, or print the branded counter stand. The QR contains a GiantPay HTTPS checkout URL and an opaque token; amounts and merchant identity are resolved by the backend.',
      ],
      [
        'Customer: scan and review',
        'Use a phone camera to open checkout. Check the merchant name and amount, choose an available method and submit once. Sandbox payment methods simulate the journey; real acceptance needs provider approval.',
      ],
      [
        'Wait for authoritative confirmation',
        'Pending and processing mean payment is not yet confirmed. Successful payment shows a receipt only after the backend confirms it. Failed, cancelled and expired outcomes stay distinct. A screenshot or redirect is not payment evidence.',
      ],
      [
        'Merchant: verify and manage',
        'Check the payment reference in the merchant workspace before releasing goods. Revoke a QR that should no longer be used. Expiry, amount bounds and usage limits are enforced by the server.',
      ],
    ],
  ),
  '/products/merchant-devices': page(
    'Merchant devices and counter payments',
    'Explore GiantPay QR counter displays and the difference between QR links, NFC tags and partner-dependent contactless card terminals.',
    'QR today · Card integration pending',
    [
      [
        'A counter display for your checkout',
        'A GiantPay QR can be displayed on a merchant screen or printed stand. The customer scans the code and completes the existing browser checkout. The supplied Aisino photograph is a visual reference, not a GiantPay device listing or partnership.',
      ],
      [
        'NFC tags open a link',
        'A separately provisioned NFC tag can point a compatible phone to the same HTTPS checkout URL. A tag opens a webpage; it does not read cards or confirm payment. Tag provisioning and device testing are not implemented here.',
      ],
      [
        'Contactless cards need an acquiring integration',
        'A contactless symbol does not enable card processing. No terminal SDK, documented model protocol, acquiring contract or certification evidence was found in this repository. Terminal/card integration remains pending.',
      ],
      [
        'What is needed next',
        'Obtain a supplier model and SDK, integration documentation, test hardware, acquiring agreement, supported-country confirmation and applicable certification evidence. Do not enter card numbers or PINs into this demonstration.',
      ],
    ],
  ),
  '/products/currency-exchange': page(
    'Currency exchange journey demonstration',
    'Explore a synthetic GiantPay currency quote with source and destination currencies, fees, totals and expiry. Exchange execution is disabled.',
    'Demonstration only',
    [
      [
        'Illustrative quotes only',
        'The calculator uses invented demonstration rates and fees, not live market data or an executable offer. It never sends an exchange instruction or moves funds.',
      ],
      [
        'Provider availability',
        'Flutterwave’s Swap FAQ currently limits Swap to registered, verified users in Nigeria. Its separate FX API requires account enablement and lists NGN/USD, GHS/USD and USD/NGN pairs, without MWK. Malawi exchange eligibility is not established by checkout credentials.',
      ],
      [
        'Before any integration',
        'GiantPlus needs an approved provider contract specifying Malawi eligibility, MWK currency pairs, account access, pricing and fees, quote validity, funding and settlement, compliance obligations and authoritative trade confirmation. Execution remains disabled.',
      ],
    ],
  ),
  '/products/payment-links': page(
    'Payment links for Malawian businesses',
    'Share a GiantPay sandbox payment link with customers and track backend-confirmed outcomes in the merchant workspace.',
    'Sandbox available',
    [
      [
        'Share a checkout URL',
        'Use the merchant payment-link form to create a checkout target with the supported amount and usage settings. Share the generated URL with your customer.',
      ],
      [
        'Follow the payment outcome',
        'Customers review checkout and submit a configured sandbox payment. Check the backend status before treating a payment as complete. Real collections need separate provider activation.',
      ],
    ],
  ),
  '/products/hosted-checkout': page(
    'Hosted online checkout in Malawi',
    'Test GiantPay hosted checkout with payment status verification and merchant transaction records.',
    'Sandbox available',
    [
      [
        'A browser checkout journey',
        'Customers open the generated checkout link, review the merchant and amount, and choose a configured sandbox method. No raw card details are collected by GiantPay.',
      ],
      [
        'Payment confirmation',
        'The checkout polls the backend for an authoritative outcome. Pending, processing, successful, failed, cancelled and expired states are distinct. Provider-hosted card checkout remains subject to provider approval.',
      ],
    ],
  ),
  '/products/collections': page(
    'Merchant payment collections',
    'Explore sandbox merchant collections through GiantPay payment links, hosted checkout and QR payments.',
    'Sandbox available',
    [
      [
        'Collect through checkout',
        'Use the existing payment links, QR codes and checkout records to test customer payment journeys. Automatic subscription billing and invoice reminders are not offered as active services.',
      ],
      [
        'Reconcile your records',
        'Use transaction and ledger evidence in the merchant workspace. Real collections and settlement depend on approved provider integrations.',
      ],
    ],
  ),
  '/products/disbursements': page(
    'Payout readiness and settlement records',
    'Review GiantPay sandbox settlement records. Real payouts and external transfers are disabled.',
    'Real payouts disabled',
    [
      [
        'Review accounting evidence',
        'Sandbox settlement and reconciliation tools support internal records and review. Creating an accounting batch does not send money.',
      ],
      [
        'External transfer integration pending',
        'Actual payouts require approved provider access, account permissions, documented settlement terms and verified transfer callbacks. Real payouts remain disabled.',
      ],
    ],
  ),
  '/services/online-payments': page(
    'Online payments for Malawi businesses',
    'Plan a GiantPay online payment integration using sandbox checkout, payment links and authoritative backend verification.',
    'Sandbox integration',
    [
      [
        'Choose your starting point',
        'Share a hosted payment link or use the documented checkout API. Keep secret API keys on your server and test with synthetic accounts.',
      ],
      [
        'Verify the outcome',
        'Use backend-confirmed status and signed webhook evidence. Do not trust a browser redirect or query parameter as proof of payment. Production acceptance requires provider approval.',
      ],
    ],
  ),
  '/services/merchant-tools': page(
    'Merchant payment management',
    'Manage GiantPay sandbox transaction records, QR codes, payment links and reconciliation with tenant permissions.',
    'Merchant workspace',
    [
      [
        'Operate with clear evidence',
        'The workspace brings transaction records, payment links, QR codes, reporting and reconciliation together. Availability depends on your assigned permissions.',
      ],
      [
        'Separate staff access',
        'Merchant sessions and staff sessions remain isolated. Staff access uses its existing MFA and role controls.',
      ],
    ],
  ),
  '/company/about': page(
    'About GiantPay',
    'GiantPay is a payment gateway being developed by GiantPlus for businesses in Malawi.',
    'GiantPlus · Malawi',
    [
      [
        'Built around merchant needs',
        'GiantPay brings checkout, QR payments and merchant transaction tools into a shared sandbox. Live payment acceptance requires separate provider and regulatory readiness.',
      ],
      [
        'Find us',
        'GiantPlus, Area 46, Lilongwe, Malawi. Company website: giantplus-mw.com. Email: info@giantplus-mw.com. GiantPay product domain: giantpay.mw.',
      ],
    ],
  ),
  '/company/giantplus': page(
    'GiantPlus and GiantPay',
    'Contact GiantPlus in Area 46, Lilongwe, Malawi, the company behind GiantPay.',
    'Company',
    [
      [
        'GiantPlus',
        'GiantPlus is the company behind GiantPay. Visit giantplus-mw.com for company information and use giantpay.mw for the payment gateway product.',
      ],
      [
        'Contact details',
        'Area 46, Lilongwe, Malawi. Email info@giantplus-mw.com for business, integration and device enquiries.',
      ],
    ],
  ),
  '/company/contact': page(
    'Contact GiantPlus about GiantPay',
    'Contact GiantPlus at info@giantplus-mw.com, Area 46, Lilongwe, Malawi, for GiantPay merchant and integration enquiries.',
    'Let’s talk',
    [
      [
        'Email our team',
        'info@giantplus-mw.com is the supplied contact for merchant, integration and device enquiries. Use the email link below to open your mail application. No message is submitted from this page.',
      ],
      [
        'Company and product',
        'GiantPlus, Area 46, Lilongwe, Malawi. Company: giantplus-mw.com. Payment gateway: giantpay.mw.',
      ],
    ],
  ),
  '/company/compliance': page(
    'Security controls and production readiness',
    'Understand GiantPay sandbox security controls and the external approvals still required for production payment services.',
    'Readiness',
    [
      [
        'Implemented controls',
        'The application uses separate merchant and staff sessions, staff MFA, CSRF checks, tenant permissions, signed callbacks and backend verification. These controls do not constitute a certification.',
      ],
      [
        'External approvals',
        'No RBM licence, PCI DSS certification, SOC 2 audit or acquiring approval is claimed here. Production processing requires documented approvals and provider acceptance beyond local software tests.',
      ],
    ],
  ),
  '/company/careers': page(
    'Careers enquiries',
    'Contact GiantPlus for current GiantPay careers information in Malawi.',
    'Company',
    [
      [
        'Ask about opportunities',
        'No verified job listings are published here. Contact info@giantplus-mw.com for current information.',
      ],
    ],
  ),
  '/developers/sdks': page(
    'Payment integration and SDK status',
    'Use GiantPay’s documented sandbox API. Published language SDKs and terminal SDK integrations are not verified.',
    'Developer resources',
    [
      [
        'Use the documented API',
        'Explore the API documentation and sandbox integration examples. Keep secret keys on your backend. No published Node, PHP or Python package is claimed as available.',
      ],
      [
        'Hardware SDKs',
        'No merchant-terminal SDK, device protocol or acquiring integration documentation was found. Card terminal support remains pending supplier and acquirer access.',
      ],
    ],
  ),
};

for (const [slug, name] of [
  ['mobile-money', 'Mobile money'],
  ['card-payments', 'Card payments'],
  ['bank-transfers', 'Bank transfers'],
] as const) {
  publicPages[`/services/${slug}`] = page(
    `${name} integration readiness`,
    `Explore GiantPay sandbox ${name.toLowerCase()} journeys for Malawi. Real acceptance depends on approved provider access.`,
    'Provider integration pending',
    [
      [
        'Test the journey',
        `GiantPay supports testing configured sandbox payment methods. ${name} production availability, account eligibility, fees and settlement terms require written provider confirmation.`,
      ],
      [
        'No production acceptance claim',
        'Payment method names describe intended integration journeys. They do not establish a partnership, certification or an active payment rail.',
      ],
    ],
  );
}
for (const [slug, title, text] of [
  [
    'guides',
    'Payment integration guides',
    'Start with the public API documentation and sandbox guide. Test checkout, status verification and webhook handling with synthetic data before requesting provider acceptance.',
  ],
  [
    'help',
    'GiantPay help',
    'Explore the QR payments guide and sandbox documentation, or contact info@giantplus-mw.com. For a payment enquiry, include the reference without passwords, secret keys or card details.',
  ],
  [
    'security',
    'Payment security controls',
    'Keep API secrets on your server. Verify payment outcomes through the backend. Merchant/staff isolation, MFA, CSRF, tenant permissions and webhook verification remain in place. No certification is claimed.',
  ],
  [
    'blog',
    'GiantPay product resources',
    'Product guides explain sandbox checkout, QR payments and integration readiness. No unverified news or customer case studies are published here.',
  ],
] as const)
  publicPages[`/resources/${slug}`] = page(title, text, 'Resources', [
    ['Learn about GiantPay', text],
  ]);

export const productPaths = Object.keys(publicPages).filter((path) =>
  path.startsWith('/products/'),
);

publicPages['/developers/overview'] = page(
  'Payment integration for Malawi',
  'Build and test GiantPay checkout, payment links and QR payments using the local sandbox API.',
  'Integration tools',
  [
    [
      'Use the existing API',
      'The local backend implements merchant payment links, QR management, checkout submission and trusted payment status. Set your API base URL to your own local backend; a public production API is not promised.',
    ],
    [
      'Keep trust on the backend',
      'Use server-side keys and idempotency keys for mutations. Public customers open opaque checkout URLs. Verify the final payment state through the backend rather than redirect parameters.',
    ],
    [
      'Test before activation',
      'Use synthetic identities and signed sandbox callbacks. Local passing tests do not establish provider acceptance. Live collections, payouts and currency exchange execution remain disabled.',
    ],
  ],
);
publicPages['/developers/api-documentation'] = page(
  'Sandbox payment API documentation',
  'Use the implemented GiantPay QR and payment-link endpoints and trusted payment status API in a local sandbox.',
  'Local API',
  [
    [
      'Merchant endpoints',
      'Authenticated merchant management uses GET/POST /v1/qr, GET/PATCH /v1/qr/:id and GET /v1/qr/:id/payments. Payment-link management uses /v1/payment-links. QR mutations require payments.links:manage, tenant authorization and an Idempotency-Key for creation. Cookie sessions also require CSRF checks.',
    ],
    [
      'QR creation fields',
      'POST /v1/qr accepts label, currency (MWK), mode (FIXED or CUSTOMER_ENTERED), amountMinor for fixed mode, optional minAmountMinor/maxAmountMinor, expiresAt and maxSuccessfulPayments. Amounts are integer minor units. The response contains the canonical HTTPS checkout URL with its opaque token.',
    ],
    [
      'Customer checkout endpoints',
      'GET /v1/checkout/qr/:token returns the merchant name, amount rules and configured channels. POST /v1/checkout/qr/:token/submit accepts channel, customer and requestedAmountMinor for customer-entered mode, with an Idempotency-Key. Fixed amounts always come from backend storage.',
    ],
    [
      'Authoritative payment status',
      'GET /v1/payment-status/:reference returns the backend outcome. A submit response, redirect, QR scan or timer must never generate a successful receipt. Do not put secret API keys in a browser or mobile frontend.',
    ],
    [
      'Complete backend contract',
      'The repository server/openapi/giantpay-v1.yaml is validated with the existing OpenAPI command. Use the checked-in specification for request/response details and authorization requirements; the page is a local integration overview.',
    ],
  ],
);
publicPages['/developers/collections-api'] = page(
  'Collections API sandbox',
  'Use existing GiantPay payment links and QR checkout endpoints to test merchant collections in Malawi.',
  'Sandbox available',
  [
    [
      'Create and share checkout',
      'Create an authenticated merchant payment link or QR code. The generated checkout URL identifies backend-held payment rules. Use the API documentation page and checked-in OpenAPI contract for payload details.',
    ],
    [
      'Confirm the result',
      'Submit checkout once with an idempotency key and follow the returned reference using trusted payment status. A signed sandbox callback drives the final outcome in tests. Real mobile-money and card collections require approved provider access.',
    ],
  ],
);
publicPages['/developers/disbursements-api'] = publicPages['/products/disbursements']!;
publicPages['/developers/webhooks-api'] = page(
  'Payment webhook integration',
  'Understand GiantPay’s signed sandbox provider callbacks and merchant webhook delivery controls.',
  'Local integration',
  [
    [
      'Provider confirmation',
      'The sandbox endpoint POST /v1/webhooks/providers/sandbox accepts signed synthetic status events. Existing timestamp/signature verification and payment locks protect ledger effects. Flutterwave payment confirmation uses its existing verification adapter, with test clients in local acceptance.',
    ],
    [
      'Merchant delivery',
      'The developer workspace manages merchant webhook endpoints and delivery records under existing permissions. Use the checked-in OpenAPI contract and sandbox documentation for exact event formats and signatures.',
    ],
    [
      'Protect secrets and destinations',
      'Keep signing secrets on the server. Preserve existing destination validation, DNS checks, duplicate-event handling and tenant controls. A callback payload alone is not provider acceptance.',
    ],
  ],
);
publicPages['/developers/sandbox'] = page(
  'Test payments in the sandbox',
  'Test GiantPay merchant QR checkout and backend verification locally with synthetic accounts and disposable services.',
  'No real money',
  [
    [
      'Local development',
      'Run the merchant frontend and local API using sandbox configuration. Use disposable PostgreSQL and Redis services, synthetic merchant identities and signed sandbox callbacks. Merchant QR URLs keep the giantpay.mw HTTPS origin; local acceptance maps the URL path onto its disposable frontend.',
    ],
    [
      'Test both sides',
      'Create a merchant QR, decode it independently, open customer checkout and submit once. Confirm no receipt appears before authoritative backend success. Exercise pending, processing, failed, cancelled and expired states.',
    ],
    [
      'Separate staff access',
      'Run the staff portal at its separate configured origin, provision only synthetic staff and complete MFA. Live payments, real payouts and currency exchange execution stay disabled.',
    ],
  ],
);

publicPages['/pricing'] = page(
  'Sandbox payment pricing',
  'Understand GiantPay sandbox fee calculations. Production commercial terms require separate confirmation.',
  'Sandbox calculations',
  [
    [
      'Collection fee examples',
      'The existing sandbox calculates 3% for mobile-money and card collections and 2% for bank-transfer collections. For a 100.00 MWK test payment, these are 3.00 MWK and 2.00 MWK respectively. These are sandbox rules, not a live executable provider quote.',
    ],
    [
      'Production terms remain separate',
      'Provider eligibility, settlement schedules, applicable taxes, production fees and service agreements must be confirmed before any real payment acceptance. No uptime or settlement SLA is offered here.',
    ],
  ],
);
