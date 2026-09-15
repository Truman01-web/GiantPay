import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';

const BASE_URL = `${env.apiUrl}/v1`;

const mockApplications = [
  {
    id: 'app_01j7app001',
    merchantId: 'mch_01j7mch001',
    businessName: 'KambaZa Pay Malawi Ltd',
    status: 'SUBMITTED',
    riskLevel: 'LOW',
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    reviewedBy: null,
    approvedBy: null,
    businessType: 'PRIVATE_LIMITED',
    registrationNumber: 'MWR-2024-88412',
    taxNumber: 'TPIN-99482103',
    addresses: [
      { type: 'REGISTERED', addressLine1: 'Victoria Avenue, Plot 42', city: 'Blantyre', country: 'Malawi' },
    ],
    directors: [
      { fullName: 'Chikondi Banda', nationality: 'Malawian', isPep: false },
    ],
    beneficialOwners: [
      { fullName: 'Chikondi Banda', percentageBasisPoints: 10000 },
    ],
    declarations: { antiMoneyLaunderingCompliance: true, taxCompliance: true },
    evidenceFiles: [
      { id: 'doc_01', category: 'CERTIFICATE_OF_INCORPORATION', originalFilename: 'certificate_of_inc.pdf' },
      { id: 'doc_02', category: 'DIRECTOR_ID', originalFilename: 'national_id_chikondi.pdf' },
    ],
  },
  {
    id: 'app_01j7app002',
    merchantId: 'mch_01j7mch002',
    businessName: 'Nyasa Express Deliveries',
    status: 'UNDER_REVIEW',
    riskLevel: 'MEDIUM',
    submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    reviewedBy: 'usr_compliance_lead',
    approvedBy: null,
    businessType: 'SOLE_PROPRIETORSHIP',
    registrationNumber: 'MWR-2023-11029',
    addresses: [
      { type: 'OPERATIONAL', addressLine1: 'City Centre, Area 4', city: 'Lilongwe', country: 'Malawi' },
    ],
    directors: [
      { fullName: 'Tionge Phiri', nationality: 'Malawian', isPep: false },
    ],
  },
];

const mockAuditEvents = [
  {
    id: 'aud_01j7aud001',
    actorId: 'usr_01j7usr001',
    actorEmail: 'chikondi.banda@kambazapay.mw',
    merchantId: 'mch_01j7mch001',
    action: 'SESSION_LOGIN_COMPLETED',
    resourceType: 'session',
    resourceId: 'ses_01j7',
    ipAddress: '197.220.168.45',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'aud_01j7aud002',
    actorId: 'usr_01j7usr001',
    actorEmail: 'chikondi.banda@kambazapay.mw',
    merchantId: 'mch_01j7mch001',
    action: 'API_KEY_CREATED',
    resourceType: 'api_key',
    resourceId: 'key_01j7key999',
    ipAddress: '197.220.168.45',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'aud_01j7aud003',
    actorId: 'usr_01j7usr001',
    actorEmail: 'chikondi.banda@kambazapay.mw',
    merchantId: 'mch_01j7mch001',
    action: 'REPORT_EXPORT_REQUESTED',
    resourceType: 'report_export',
    resourceId: 'exp_01j7abc123',
    ipAddress: '197.220.168.45',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

const mockPendingRefunds = [
  {
    id: 'ref_pending_001',
    paymentId: 'pay_01j7pay001',
    paymentReference: 'gp_pay_ref001',
    customerName: 'Tamanda Moyo',
    amountMinor: 2500000,
    currency: 'MWK',
    reason: 'Customer requested cancellation before order processing',
    requestedBy: { id: 'usr_01j7usr001', name: 'Chikondi Banda' },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const adminHandlers = [
  http.get(`${BASE_URL}/compliance/applications`, () => {
    return HttpResponse.json({
      items: mockApplications,
      total: mockApplications.length,
    });
  }),

  http.get(`${BASE_URL}/compliance/applications/:id`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id) || mockApplications[0];
    return HttpResponse.json(app);
  }),

  http.post(`${BASE_URL}/compliance/applications/:id/review`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id) || mockApplications[0];
    app.status = 'UNDER_REVIEW';
    return HttpResponse.json({ status: 'UNDER_REVIEW' });
  }),

  http.post(`${BASE_URL}/compliance/applications/:id/information-requests`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id) || mockApplications[0];
    app.status = 'INFO_REQUESTED';
    return HttpResponse.json({ status: 'INFO_REQUESTED' }, { status: 201 });
  }),

  http.post(`${BASE_URL}/compliance/applications/:id/risk-classifications`, async ({ params, request }) => {
    const body = (await request.json()) as { riskLevel: string };
    const app = mockApplications.find((a) => a.id === params.id) || mockApplications[0];
    app.riskLevel = body.riskLevel;
    return HttpResponse.json({ riskLevel: body.riskLevel }, { status: 201 });
  }),

  http.post(`${BASE_URL}/compliance/applications/:id/approve`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id) || mockApplications[0];
    app.status = 'APPROVED';
    return HttpResponse.json({ status: 'APPROVED' });
  }),

  http.post(`${BASE_URL}/compliance/applications/:id/reject`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id) || mockApplications[0];
    app.status = 'REJECTED';
    return HttpResponse.json({ status: 'REJECTED' });
  }),

  http.post(`${BASE_URL}/compliance/applications/:id/suspend`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id) || mockApplications[0];
    app.status = 'SUSPENDED';
    return HttpResponse.json({ status: 'SUSPENDED' });
  }),

  http.get(`${BASE_URL}/compliance/applications/:id/decisions`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'dec_001',
          action: 'APPLICATION_SUBMITTED',
          actorId: 'usr_merchant',
          actorName: 'Chikondi Banda',
          note: 'Initial KYC submission',
          createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        },
      ],
    });
  }),

  http.get(`${BASE_URL}/admin/refunds/pending`, () => {
    return HttpResponse.json({
      items: mockPendingRefunds,
      total: mockPendingRefunds.length,
    });
  }),

  http.post(`${BASE_URL}/admin/refunds/:id/decision`, ({ params }) => {
    const idx = mockPendingRefunds.findIndex((r) => r.id === params.id);
    if (idx !== -1) mockPendingRefunds.splice(idx, 1);
    return HttpResponse.json({ status: 'DECIDED' });
  }),

  http.get(`${BASE_URL}/audit-events`, () => {
    return HttpResponse.json({
      items: mockAuditEvents,
      total: mockAuditEvents.length,
    });
  }),

  http.get(`${BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      database: true,
      rateLimiter: true,
      workers: true,
      timestamp: new Date().toISOString(),
    });
  }),

  http.get(`${BASE_URL}/health/live`, () => {
    return HttpResponse.json({ status: 'alive' });
  }),

  http.get(`${BASE_URL}/health/ready`, () => {
    return HttpResponse.json({ status: 'ready' });
  }),
];
