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
  it('9. renders hero section with accurate sandbox copy and primary/secondary actions', () => {
    renderLandingPage();

    // Required Heading
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /payments built for modern malawian businesses/i,
      })
    ).toBeInTheDocument();

    // Required Supporting text
    expect(
      screen.getByText(
        /create payment experiences, manage transactions and prepare your business for secure mobile-money, card and bank-transfer integrations/i
      )
    ).toBeInTheDocument();

    // Primary action: Create sandbox account
    const primaryCta = screen.getByRole('link', { name: /create sandbox account/i });
    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveAttribute('href', '/register');

    // Secondary action: Explore the API
    const secondaryCta = screen.getByRole('link', { name: /explore the api/i });
    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveAttribute('href', '/developers');
  });

  it('10. renders all required payment methods without emojis', () => {
    const { container } = renderLandingPage();
    const textContent = container.textContent || '';

    // Verify emojis have been completely eliminated
    expect(textContent).not.toContain('📱');
    expect(textContent).not.toContain('⚡');
    expect(textContent).not.toContain('💳');
    expect(textContent).not.toContain('🏦');

    // Verify required text labels
    expect(screen.getByText('Airtel Money')).toBeInTheDocument();
    expect(screen.getByText('TNM Mpamba')).toBeInTheDocument();
    expect(screen.getByText('Visa')).toBeInTheDocument();
    expect(screen.getByText('Mastercard')).toBeInTheDocument();
    expect(screen.getByText('National Switch / Bank Transfer')).toBeInTheDocument();
  });

  it('11. provides appropriate alternative text for official brand logos', () => {
    renderLandingPage();

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

  it('12. avoids false production-integration claims and uses honest integration-ready wording', () => {
    renderLandingPage();

    // Intro header uses honest phrasing
    expect(screen.getByText(/designed for local payment integrations/i)).toBeInTheDocument();

    // Does NOT say "We accept" or "Currently supported" as production claims
    expect(screen.queryByText(/we accept/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/currently supported/i)).not.toBeInTheDocument();
  });

  it('13. maintains React StrictMode compatibility', () => {
    expect(() => renderLandingPage()).not.toThrow();
  });
});
