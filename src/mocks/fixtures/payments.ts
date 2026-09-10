import type { Payment, PaymentChannel, PaymentEvent, PaymentListItem, PaymentStatus } from '@/types/payments';

// All data below is synthetic demo data for mock/sandbox mode only — never
// real transaction history. Provider names are deliberately generic
// ("Sandbox ...") rather than naming real Malawian telecoms/banks, since no
// provider integration is actually configured in this frontend build.

const CUSTOMER_NAMES = [
  'Thandiwe Mvula',
  'Blessings Kachale',
  'Chisomo Nyirenda',
  'Mphatso Chirwa',
  'Yamikani Gondwe',
  'Precious Mbewe',
  'Dalitso Kamanga',
  'Ellube Chulu',
  'Tadala Msiska',
  'Vitumbiko Zimba',
];

const CHANNELS: PaymentChannel[] = ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER'];
const STATUSES: PaymentStatus[] = [
  'SUCCEEDED',
  'SUCCEEDED',
  'SUCCEEDED',
  'PENDING',
  'PROCESSING',
  'FAILED',
  'EXPIRED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
];

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function providerFor(channel: PaymentChannel): string {
  if (channel === 'MOBILE_MONEY') return 'Sandbox Mobile Money';
  if (channel === 'CARD') return 'Sandbox Card Gateway';
  return 'Sandbox Bank Transfer';
}

export function generatePayments(count: number): Payment[] {
  const rand = seededRandom(42);
  const payments: Payment[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const channel = pick(CHANNELS, rand);
    const status = pick(STATUSES, rand);
    const grossMinor = Math.round((500 + rand() * 250000) / 50) * 50;
    const feeMinor = Math.round(grossMinor * 0.018);
    const taxMinor = 0;
    const netMinor = grossMinor - feeMinor - taxMinor;
    const createdAt = new Date(now - rand() * 1000 * 60 * 60 * 24 * 90).toISOString();
    const refundedMinor =
      status === 'REFUNDED' ? grossMinor : status === 'PARTIALLY_REFUNDED' ? Math.round(grossMinor * 0.4) : 0;

    payments.push({
      id: `pay_${(i + 1).toString().padStart(5, '0')}`,
      reference: `GP-${(100000 + i).toString()}`,
      merchantReference: rand() > 0.3 ? `INV-${2000 + i}` : null,
      description: rand() > 0.5 ? 'Invoice payment' : 'Order payment',
      status,
      channel,
      providerName: providerFor(channel),
      gross: { amountMinor: grossMinor, currency: 'MWK' },
      fee: { amountMinor: feeMinor, currency: 'MWK' },
      tax: { amountMinor: taxMinor, currency: 'MWK' },
      net: { amountMinor: netMinor, currency: 'MWK' },
      refundableAmountMinor: grossMinor - refundedMinor,
      refundedAmountMinor: refundedMinor,
      customer: {
        name: pick(CUSTOMER_NAMES, rand),
        email: rand() > 0.4 ? 'customer@example.mw' : null,
        phone: rand() > 0.2 ? `+265 9${Math.floor(rand() * 90000000 + 10000000)}` : null,
      },
      createdAt,
      updatedAt: createdAt,
      expiresAt: status === 'EXPIRED' ? createdAt : null,
      reconciliationState: rand() > 0.85 ? 'EXCEPTION' : rand() > 0.3 ? 'MATCHED' : 'UNRECONCILED',
      settlementState: status === 'SUCCEEDED' ? (rand() > 0.5 ? 'SETTLED' : 'PENDING') : 'NOT_SETTLED',
    });
  }

  return payments;
}

export const MOCK_PAYMENTS = generatePayments(184);

export function toListItem(p: Payment): PaymentListItem {
  return {
    id: p.id,
    reference: p.reference,
    merchantReference: p.merchantReference,
    customerName: p.customer.name,
    amount: p.gross,
    channel: p.channel,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function eventsFor(payment: Payment): PaymentEvent[] {
  const base = new Date(payment.createdAt).getTime();
  const events: PaymentEvent[] = [
    { id: 'evt_1', type: 'PAYMENT_CREATED', label: 'Payment created', occurredAt: new Date(base).toISOString() },
    {
      id: 'evt_2',
      type: 'ATTEMPT_STARTED',
      label: 'Payment attempt started',
      occurredAt: new Date(base + 2_000).toISOString(),
    },
    {
      id: 'evt_3',
      type: 'PROVIDER_REQUEST_ACCEPTED',
      label: 'Provider request accepted',
      occurredAt: new Date(base + 4_000).toISOString(),
    },
  ];

  if (payment.status !== 'CREATED' && payment.status !== 'PROCESSING') {
    events.push({
      id: 'evt_4',
      type: 'PROVIDER_RESPONSE_RECEIVED',
      label: 'Provider response received',
      occurredAt: new Date(base + 8_000).toISOString(),
      detail: payment.status === 'FAILED' ? 'Provider declined the transaction' : undefined,
    });
  }

  if (['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REFUND_PENDING'].includes(payment.status)) {
    events.push(
      {
        id: 'evt_5',
        type: 'WEBHOOK_RECEIVED',
        label: 'Webhook/callback received',
        occurredAt: new Date(base + 10_000).toISOString(),
      },
      {
        id: 'evt_6',
        type: 'STATUS_VERIFIED',
        label: 'Backend verified status',
        occurredAt: new Date(base + 11_000).toISOString(),
      },
      {
        id: 'evt_7',
        type: 'LEDGER_RECORDED',
        label: 'Ledger event recorded',
        occurredAt: new Date(base + 12_000).toISOString(),
      },
    );
    if (payment.reconciliationState === 'MATCHED') {
      events.push({
        id: 'evt_8',
        type: 'RECONCILED',
        label: 'Reconciled',
        occurredAt: new Date(base + 3600_000).toISOString(),
      });
    }
    if (payment.settlementState === 'SETTLED') {
      events.push({
        id: 'evt_9',
        type: 'SETTLEMENT_UPDATED',
        label: 'Settlement updated',
        occurredAt: new Date(base + 86_400_000).toISOString(),
      });
    }
  }

  return events;
}
