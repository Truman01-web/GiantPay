import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, cleanup } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import StatusPage from './StatusPage';

const originalMock = env.useMockApi;
beforeEach(() => { env.useMockApi = false; });
afterEach(() => { cleanup(); env.useMockApi = originalMock; });
function renderStatus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><StatusPage /></MemoryRouter></QueryClientProvider>);
}
function responses(live: () => Response, ready: () => Response) {
  server.use(http.get(`${env.apiUrl}/v1/health/live`, live), http.get(`${env.apiUrl}/v1/health/ready`, ready));
}
const alive = () => HttpResponse.json({ status: 'alive' });
const ready = () => HttpResponse.json({ status: 'ready' });

describe('public system status', () => {
  it('reports operational only for valid healthy responses', async () => {
    responses(alive, ready); renderStatus();
    expect(await screen.findByText('Operational')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh status/i })).toBeEnabled();
  });
  it('reports degraded when the responding API is not ready', async () => {
    responses(alive, () => HttpResponse.json({ status: 'unavailable' }, { status: 503 })); renderStatus();
    expect(await screen.findByText('Degraded')).toBeInTheDocument();
  });
  it('reports unavailable only from an explicit liveness response', async () => {
    responses(() => HttpResponse.json({ status: 'unavailable' }, { status: 503 }), ready); renderStatus();
    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
  });
  it('cannot verify malformed responses', async () => {
    responses(alive, () => HttpResponse.json({ unexpected: true })); renderStatus();
    await screen.findByText(/Last check:/);
    expect(await screen.findByText(/Unable to verify API health/)).toBeInTheDocument();
  });
  it('cannot verify network failures', async () => {
    responses(() => HttpResponse.error(), ready); renderStatus();
    await screen.findByText(/Last check:/);
    expect(await screen.findByText(/Unable to verify API health/)).toBeInTheDocument();
  });
});
