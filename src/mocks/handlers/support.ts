import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';

const BASE_URL = `${env.apiUrl}/v1`;

const mockTickets = [
  {
    id: 'tic_01j7tic001',
    reference: 'SUP-88214',
    subject: 'Webhook signature verification question for Node.js',
    category: 'INTEGRATION',
    priority: 'NORMAL',
    status: 'IN_PROGRESS',
    message: 'We are verifying the HMAC signature using raw bodies in Fastify. Could you confirm timestamp tolerance?',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'tic_01j7tic002',
    reference: 'SUP-71934',
    subject: 'Sandbox testing with Airtel Money test simulator',
    category: 'PAYMENT',
    priority: 'LOW',
    status: 'RESOLVED',
    message: 'Tested mobile push notifications in sandbox checkout. Everything confirmed successfully.',
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
];

export const supportHandlers = [
  http.get(`${BASE_URL}/support/tickets`, () => {
    return HttpResponse.json({
      items: mockTickets,
      total: mockTickets.length,
    });
  }),

  http.post(`${BASE_URL}/support/tickets`, async ({ request }) => {
    const body = (await request.json()) as { subject: string; category: string; priority: string; message: string };
    const newTicket = {
      id: `tic_${crypto.randomUUID().slice(0, 8)}`,
      reference: `SUP-${Math.floor(10000 + Math.random() * 90000)}`,
      subject: body.subject,
      category: body.category,
      priority: body.priority,
      status: 'OPEN',
      message: body.message,
      createdAt: new Date().toISOString(),
    };
    mockTickets.unshift(newTicket);
    return HttpResponse.json(newTicket, { status: 201 });
  }),
];
