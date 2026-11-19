import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

describe('GiantPay public availability and product journey', () => {
  it('identifies the Malawi product and gives a sandbox starting point', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Malawi/);
    expect(screen.getByRole('link', { name: 'Start in the sandbox' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByText(/Live payments and payouts disabled/)).toBeVisible();
    expect(screen.queryByText(/RBM Compliant|PCI DSS Ready|Real-time Settlements/)).toBeNull();
  });
  it('offers QR, device and synthetic exchange guides with the supplied company contact', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Explore QR payments' })).toHaveAttribute(
      'href',
      '/products/qr-payments',
    );
    expect(screen.getByRole('link', { name: 'Explore merchant devices' })).toHaveAttribute(
      'href',
      '/products/merchant-devices',
    );
    expect(screen.getByRole('link', { name: 'Try the quote demonstration' })).toHaveAttribute(
      'href',
      '/products/currency-exchange',
    );
    expect(screen.getByRole('link', { name: 'info@giantplus-mw.com' })).toHaveAttribute(
      'href',
      'mailto:info@giantplus-mw.com',
    );
  });
});
