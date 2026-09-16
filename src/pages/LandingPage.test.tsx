import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

function renderLandingPage() {
  return render(
    <React.StrictMode>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </React.StrictMode>
  );
}

describe('LandingPage Hero Section & Brand Assets', () => {
  it('9. renders hero section with heading and primary/secondary actions', () => {
    renderLandingPage();

    // Required Heading (split across <br />/<span> for the gradient words)
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/unified/i);
    expect(heading.textContent).toMatch(/one/i);
    expect(heading.textContent).toMatch(/integration/i);

    // Required Supporting text
    expect(
      screen.getByText(
        /giantpay helps businesses and digital platforms in malawi accept and manage configured digital payment methods/i
      )
    ).toBeInTheDocument();

    // Primary action
    const primaryCta = screen.getByRole('link', { name: /get started free/i });
    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveAttribute('href', '/register');

    // Secondary action
    const secondaryCta = screen.getByRole('link', { name: /explore developer tools/i });
    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveAttribute('href', '/developers');
  });

  it('10. renders payment method logos without emojis or name labels', () => {
    const { container } = renderLandingPage();
    const textContent = container.textContent || '';

    // Verify emojis have been completely eliminated
    expect(textContent).not.toContain('📱');
    expect(textContent).not.toContain('⚡');
    expect(textContent).not.toContain('💳');
    expect(textContent).not.toContain('🏦');

    // The payment-methods strip now renders logos only, with no visible
    // name label beside them (name text still appears elsewhere on the
    // page, e.g. "Airtel Money" in the floating transaction-card mockup,
    // so this only checks the strip's own labels are gone).
    expect(screen.queryByText('TNM Mpamba')).not.toBeInTheDocument();
    expect(screen.queryByText('Mastercard')).not.toBeInTheDocument();
    expect(screen.queryByText('National Switch / Bank Transfer')).not.toBeInTheDocument();

    // National Switch has no logo asset, so it still falls back to its
    // initials ("NS") as bare text — the one exception to logos-only.
    expect(screen.getAllByText('NS').length).toBeGreaterThan(0);
  });

  it('11. provides appropriate alternative text for official brand logos', () => {
    renderLandingPage();

    // The strip's duplicate copy (for the seamless loop) is aria-hidden and
    // uses an empty alt, so exactly one accessible instance of each logo
    // remains — everything else on the page uses inline SVGs, not <img>.
    const airtelImg = screen.getByAltText('Airtel Money logo');
    expect(airtelImg).toBeInTheDocument();
    expect(airtelImg).toHaveAttribute('src', '/brands/airtel-money.svg');

    const tnmImg = screen.getByAltText('TNM Mpamba logo');
    expect(tnmImg).toBeInTheDocument();
    expect(tnmImg).toHaveAttribute('src', '/brands/tnm-mpamba.svg');

    const visaImg = screen.getByAltText('Visa logo');
    expect(visaImg).toBeInTheDocument();
    expect(visaImg).toHaveAttribute('src', '/brands/visa.svg');

    const mcImg = screen.getByAltText('Mastercard logo');
    expect(mcImg).toBeInTheDocument();
    expect(mcImg).toHaveAttribute('src', '/brands/mastercard.svg');
  });

  it('12. renders the payment-methods section intro copy', () => {
    renderLandingPage();
    expect(screen.getByText(/designed for local payment integrations/i)).toBeInTheDocument();
  });

  it('13. maintains React StrictMode compatibility', () => {
    expect(() => renderLandingPage()).not.toThrow();
  });
});
