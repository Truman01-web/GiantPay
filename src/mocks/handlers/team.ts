import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';

const BASE_URL = `${env.apiUrl}/v1`;

const mockMembers = [
  {
    id: 'usr_01j7usr001',
    name: 'Chikondi Banda',
    email: 'chikondi.banda@kambazapay.mw',
    role: 'Owner',
    status: 'ACTIVE',
    mfaEnabled: true,
    lastLoginAt: new Date(Date.now() - 600000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'usr_01j7usr002',
    name: 'Grace Phiri',
    email: 'grace.phiri@kambazapay.mw',
    role: 'Viewer',
    status: 'ACTIVE',
    mfaEnabled: false,
    lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

const mockInvitations = [
  {
    id: 'inv_01j7inv001',
    email: 'finance@kambazapay.mw',
    role: 'Finance',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    deliveryToken: 'inv_tok_demo12345678',
  },
];

const mockRoles = [
  {
    id: 'role_owner',
    name: 'Owner',
    description: 'Full merchant-level control and financial authority',
    permissions: [
      'payments:read',
      'payments.links:manage',
      'payments.refunds:request',
      'settlements:read',
      'reconciliation:read',
      'reconciliation:manage',
      'reports:read',
      'reports:export',
      'developer.apiKeys:manage',
      'developer.webhooks:manage',
      'team:manage',
      'roles:manage',
    ],
    systemRole: true,
    memberCount: 1,
  },
  {
    id: 'role_developer',
    name: 'Developer',
    description: 'Manage sandbox keys, payment links, and webhook endpoints',
    permissions: [
      'payments:read',
      'payments.links:manage',
      'developer.apiKeys:manage',
      'developer.webhooks:manage',
    ],
    systemRole: true,
    memberCount: 0,
  },
  {
    id: 'role_finance',
    name: 'Finance & Operations',
    description: 'View transactions, initiate refunds, inspect reports and reconciliations',
    permissions: [
      'payments:read',
      'payments.refunds:request',
      'settlements:read',
      'reconciliation:read',
      'reports:read',
      'reports:export',
    ],
    systemRole: true,
    memberCount: 0,
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'Read-only access to transactions and payment statuses',
    permissions: ['payments:read'],
    systemRole: true,
    memberCount: 1,
  },
];

export const teamHandlers = [
  http.get(`${BASE_URL}/team/members`, () => {
    return HttpResponse.json({
      items: mockMembers,
      total: mockMembers.length,
    });
  }),

  http.get(`${BASE_URL}/team/members/:id`, ({ params }) => {
    const member = mockMembers.find((m) => m.id === params.id) || mockMembers[0];
    return HttpResponse.json(member);
  }),

  http.patch(`${BASE_URL}/team/members/:id/role`, async ({ params, request }) => {
    const body = (await request.json()) as { role: string };
    const member = mockMembers.find((m) => m.id === params.id) || mockMembers[0];
    member.role = body.role;
    return HttpResponse.json(member);
  }),

  http.post(`${BASE_URL}/team/members/:id/suspend`, ({ params }) => {
    const member = mockMembers.find((m) => m.id === params.id) || mockMembers[0];
    member.status = 'SUSPENDED';
    return HttpResponse.json({ suspended: true });
  }),

  http.post(`${BASE_URL}/team/members/:id/reactivate`, ({ params }) => {
    const member = mockMembers.find((m) => m.id === params.id) || mockMembers[0];
    member.status = 'ACTIVE';
    return HttpResponse.json({ reactivated: true });
  }),

  http.post(`${BASE_URL}/team/members/:id/remove`, ({ params }) => {
    const idx = mockMembers.findIndex((m) => m.id === params.id);
    if (idx !== -1) mockMembers.splice(idx, 1);
    return HttpResponse.json({ removed: true });
  }),

  http.get(`${BASE_URL}/team/invitations`, () => {
    return HttpResponse.json({
      items: mockInvitations,
      total: mockInvitations.length,
    });
  }),

  http.post(`${BASE_URL}/team/invitations`, async ({ request }) => {
    const body = (await request.json()) as { email: string; role: string };
    const newInv = {
      id: `inv_${crypto.randomUUID().slice(0, 8)}`,
      email: body.email,
      role: body.role,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      deliveryToken: `inv_tok_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    };
    mockInvitations.unshift(newInv);
    return HttpResponse.json(newInv, { status: 201 });
  }),

  http.post(`${BASE_URL}/team/invitations/:id/cancel`, ({ params }) => {
    const inv = mockInvitations.find((i) => i.id === params.id);
    if (inv) inv.status = 'CANCELLED';
    return HttpResponse.json({ cancelled: true });
  }),

  http.post(`${BASE_URL}/team/invitations/:id/resend`, ({ params }) => {
    const inv = mockInvitations.find((i) => i.id === params.id) || mockInvitations[0];
    inv.expiresAt = new Date(Date.now() + 72 * 3600000).toISOString();
    return HttpResponse.json(inv);
  }),

  http.get(`${BASE_URL}/roles`, () => {
    return HttpResponse.json({
      items: mockRoles,
      total: mockRoles.length,
    });
  }),

  http.post(`${BASE_URL}/roles`, async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string; permissions?: string[] };
    const newRole = {
      id: `role_${crypto.randomUUID().slice(0, 8)}`,
      name: body.name,
      description: body.description || '',
      permissions: body.permissions || [],
      systemRole: false,
      memberCount: 0,
    };
    mockRoles.push(newRole);
    return HttpResponse.json(newRole, { status: 201 });
  }),

  http.patch(`${BASE_URL}/roles/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { name?: string; description?: string; permissions?: string[] };
    const role = mockRoles.find((r) => r.id === params.id);
    if (role && !role.systemRole) {
      if (body.name) role.name = body.name;
      if (body.description !== undefined) role.description = body.description;
      if (body.permissions) role.permissions = body.permissions;
    }
    return HttpResponse.json(role);
  }),

  http.post(`${BASE_URL}/roles/:id/archive`, ({ params }) => {
    const idx = mockRoles.findIndex((r) => r.id === params.id && !r.systemRole);
    if (idx !== -1) mockRoles.splice(idx, 1);
    return HttpResponse.json({ archived: true });
  }),
];
