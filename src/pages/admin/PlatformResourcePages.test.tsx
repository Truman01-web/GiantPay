import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { AdminTransactionsPage } from './PlatformResourcePages';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><AdminTransactionsPage /></MemoryRouter></QueryClientProvider>);
}

describe('platform administration resource pages', () => {
  it('renders live API records with accessible columns and detail links', async () => {
    server.use(http.get(`${env.apiUrl}/v1/platform/transactions`, () => HttpResponse.json({ data: [{ id: 'pay_1', reference: 'GP-1', status: 'SUCCEEDED' }] })));
    renderPage();
    expect(await screen.findByRole('link', { name: 'pay_1' })).toHaveAttribute('href', '/admin/transactions/pay_1');
    expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument();
  });

  it('shows a retryable safe error state', async () => {
    let calls = 0;
    server.use(http.get(`${env.apiUrl}/v1/platform/transactions`, () => {
      calls += 1;
      return calls === 1 ? HttpResponse.json({ error: { code: 'DOWN', message: 'Unavailable' } }, { status: 503 }) : HttpResponse.json({ data: [] });
    }));
    renderPage();
    expect(await screen.findByText(/unable to load this page/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(await screen.findByText(/no all transactions found/i)).toBeInTheDocument();
  });
});
