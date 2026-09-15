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
        name: /unified payments\.\s*one integration\./i,
      })
    ).toBeInTheDocument();

    // Required Supporting text
    expect(
      screen.getByText(
        /giantpay helps businesses and digital platforms in malawi accept and manage configured digital payment methods/i
      )
    ).toBeInTheDocument();

    // Primary action: Create sandbox account
    const primaryCta = screen.getByRole('link', { name: /create sandbox account/i });
    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveAttribute('href', '/register');

    // Secondary action: Explore Developer Tools
    const secondaryCta = screen.getByRole('link', { name: /explore developer tools/i });
    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveAttribute('href', '/developers/overview');
  });

  it('10. renders payment method logos only (no visible text labels or emojis)', () => {
    const { container } = renderLandingPage();
    const textContent = container.textContent || '';

    // Verify emojis have been completely eliminated
    expect(textContent).not.toContain('📱');
    expect(textContent).not.toContain('⚡');
    expect(textContent).not.toContain('💳');
    expect(textContent).not.toContain('🏦');

    // Logos are identifiable via alt text (the marquee renders a duplicate,
    // aria-hidden copy for a seamless loop, so at least one accessible
    // instance must exist), with no adjacent visible brand-name text.
    expect(screen.getAllByAltText('Airtel Money').length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('TNM Mpamba').length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('Visa').length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('Mastercard').length).toBeGreaterThan(0);
    expect(screen.queryByText('Airtel Money')).not.toBeInTheDocument();
    expect(screen.queryByText('Mastercard')).not.toBeInTheDocument();
  });

  it('11. provides appropriate alternative text for official brand logos', () => {
    renderLandingPage();

    const airtelImg = screen.getByAltText('Airtel Money');
    expect(airtelImg).toBeInTheDocument();
    expect(airtelImg).toHaveAttribute('src', '/brands/airtel-money.svg');

    const tnmImg = screen.getByAltText('TNM Mpamba');
    expect(tnmImg).toBeInTheDocument();
    expect(tnmImg).toHaveAttribute('src', '/brands/tnm-mpamba.svg');

    const visaImg = screen.getByAltText('Visa');
    expect(visaImg).toBeInTheDocument();
    expect(visaImg).toHaveAttribute('src', '/brands/visa.svg');

    const mcImg = screen.getByAltText('Mastercard');
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
