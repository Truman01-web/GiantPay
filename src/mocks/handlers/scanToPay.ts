import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_SCAN_TO_PAY_CODES } from '../fixtures/scanToPay';
import type { ScanToPayCode, QrCheckoutInfo, QrPaymentItem } from '@/types/scanToPay';

const base = `${env.apiUrl}/v1`;
const codes: ScanToPayCode[] = [...MOCK_SCAN_TO_PAY_CODES];
const seenIdempotencyKeys = new Map<string, { reference: string; status: string; checkoutUrl: null }>();

const MOCK_QR_PAYMENTS: Record<string, QrPaymentItem[]> = {
  qr_demo_1: [
    {
      id: 'pay_qr_1',
      reference: 'GP-QR-1725177600000-101',
      status: 'SUCCEEDED',
      amountMinor: 250000,
      currency: 'MWK',
      customerName: 'Chikondi Phiri',
      createdAt: '2026-09-02T09:15:00.000Z',
    },
    {
      id: 'pay_qr_2',
      reference: 'GP-QR-1725177600000-102',
      status: 'SUCCEEDED',
      amountMinor: 250000,
      currency: 'MWK',
      customerName: 'Tawonga Banda',
      createdAt: '2026-09-03T14:22:00.000Z',
    },
  ],
};

export const scanToPayHandlers = [
  // List merchant's QR codes
  http.get(`${base}/qr`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');

    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      data: codes.slice(start, start + pageSize),
      page,
      pageSize,
      total: codes.length,
    });
  }),

  // Get single QR code by ID
  http.get(`${base}/qr/:id`, ({ params }) => {
    const code = codes.find((c) => c.id === params.id);
    if (!code) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'QR code not found.' } },
        { status: 404 },
      );
    }
    return HttpResponse.json(code);
  }),

  // Create QR code
  http.post(`${base}/qr`, async ({ request }) => {
    const body = (await request.json()) as ScanToPayCode;
    const id = `qr_${Math.random().toString(36).slice(2, 9)}`;
    const token = `token_${Math.random().toString(36).slice(2, 12)}`;

    const newCode: ScanToPayCode = {
      id,
      label: body.label,
      currency: body.currency ?? 'MWK',
      mode: body.mode,
      amountMinor: body.amountMinor ?? null,
      minAmountMinor: body.minAmountMinor ?? null,
      maxAmountMinor: body.maxAmountMinor ?? null,
      status: 'ACTIVE',
      expiresAt: body.expiresAt ?? null,
      maxSuccessfulPayments: body.maxSuccessfulPayments ?? null,
      successfulPaymentsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checkoutUrl: `http://localhost:5173/checkout/qr/${token}`,
    };

    codes.unshift(newCode);
    return HttpResponse.json(newCode, { status: 201 });
  }),

  // Disable / revoke QR code
  http.patch(`${base}/qr/:id`, async ({ params }) => {
    const code = codes.find((c) => c.id === params.id);
    if (!code) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'QR code not found.' } },
        { status: 404 },
      );
    }
    code.status = 'DISABLED';
    code.updatedAt = new Date().toISOString();
    return HttpResponse.json(code);
  }),

  // Get payments for a QR code
  http.get(`${base}/qr/:id/payments`, ({ params, request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');

    const payments = MOCK_QR_PAYMENTS[params.id as string] ?? [];
    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      data: payments.slice(start, start + pageSize),
      page,
      pageSize,
      total: payments.length,
    });
  }),

  // Public checkout QR info
  http.get(`${base}/checkout/qr/:token`, ({ params }) => {
    const token = params.token as string;
    if (token === 'demo_qr_expired') {
      const info: QrCheckoutInfo = {
        token,
        merchantDisplayName: 'Kambaza Traders',
        currency: 'MWK',
        mode: 'FIXED',
        amountMinor: 1500000,
        minAmountMinor: null,
        maxAmountMinor: null,
        availableChannels: ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER'],
        status: 'EXPIRED',
        expiresAt: '2026-09-20T23:59:59.000Z',
        label: 'Single-Use Invoice Promo',
      };
      return HttpResponse.json(info);
    }

    if (token === 'demo_qr_custom') {
      const info: QrCheckoutInfo = {
        token,
        merchantDisplayName: 'Kambaza Traders',
        currency: 'MWK',
        mode: 'CUSTOMER_ENTERED',
        amountMinor: null,
        minAmountMinor: 50000,
        maxAmountMinor: 10000000,
        availableChannels: ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER'],
        status: 'READY',
        expiresAt: null,
        label: 'Customer Discretionary Till',
      };
      return HttpResponse.json(info);
    }

    // Default: ready fixed token
    const info: QrCheckoutInfo = {
      token,
      merchantDisplayName: 'Kambaza Traders',
      currency: 'MWK',
      mode: 'FIXED',
      amountMinor: 250000,
      minAmountMinor: null,
      maxAmountMinor: null,
      availableChannels: ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER'],
      status: 'READY',
      expiresAt: null,
      label: 'Till 1 — Main Counter',
    };
    return HttpResponse.json(info);
  }),

  // Public checkout submit
  http.post(`${base}/checkout/qr/:token/submit`, async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (key && seenIdempotencyKeys.has(key)) return HttpResponse.json(seenIdempotencyKeys.get(key), { status: 202 });
    const reference = `GP-QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (key) seenIdempotencyKeys.set(key, { reference, status: 'PROCESSING', checkoutUrl: null });

    return HttpResponse.json(
      {
        reference,
        status: 'PROCESSING',
        checkoutUrl: null,
      },
      { status: 202 },
    );
  }),
];
