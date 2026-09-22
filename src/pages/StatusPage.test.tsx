import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import StatusPage from './StatusPage';

function renderStatus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><StatusPage /></MemoryRouter></QueryClientProvider>);
}

describe('public system status', () => {
  it('reports operational only after the real readiness contract succeeds', async () => {
    server.use(http.get(`${env.apiUrl}/v1/health/ready`, () => HttpResponse.json({ status: 'ready', timestamp: '2026-09-21T00:00:00.000Z' })));
    renderStatus();
    expect(await screen.findByText('Operational')).toBeInTheDocument();
  });

  it('does not fabricate success when readiness fails', async () => {
    server.use(http.get(`${env.apiUrl}/v1/health/ready`, () => HttpResponse.json({ error: { code: 'NOT_READY', message: 'Unavailable' } }, { status: 503 })));
    renderStatus();
    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/did not pass/i);
  });
});
