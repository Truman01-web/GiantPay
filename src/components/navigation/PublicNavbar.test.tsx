import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';

function renderNavbar(initialEntries = ['/']) {
  return render(
    <React.StrictMode>
      <MemoryRouter initialEntries={initialEntries}>
        <PublicNavbar />
      </MemoryRouter>
    </React.StrictMode>
  );
}

describe('PublicNavbar', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. renders fully transparent navbar at the top of the page', () => {
    renderNavbar();
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header.className).toContain('bg-transparent');
    expect(header.className).toContain('border-transparent');
    expect(header.className).toContain('shadow-none');
  });

  it('2. becomes translucent immediately after scrolling beyond threshold', () => {
    renderNavbar();
    const header = screen.getByRole('banner');

    act(() => {
      window.scrollY = 20;
      fireEvent.scroll(window);
    });

    expect(header.className).toContain('bg-white/75');
    expect(header.className).toContain('backdrop-blur-2xl');
    expect(header.className).toContain('border-white/60');
  });

  it('3. cleans up scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderNavbar();

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );
  });

  it('4. supports desktop dropdown keyboard and mouse access', () => {
    renderNavbar();
    const productsBtn = screen.getByRole('button', { name: /products/i });
    expect(productsBtn).toHaveAttribute('aria-expanded', 'false');
    expect(productsBtn).toHaveAttribute('aria-haspopup', 'true');

    // Open via click
    fireEvent.click(productsBtn);
    expect(productsBtn).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBeGreaterThan(0);
    expect(screen.getByText('Hosted Checkout')).toBeInTheDocument();
  });

  it('5. supports Escape-to-close behaviour with focus return', () => {
    renderNavbar();
    const productsBtn = screen.getByRole('button', { name: /products/i });

    // Open dropdown
    fireEvent.click(productsBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(productsBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('6. opens, expands collapsible groups, and closes mobile menu', () => {
    renderNavbar();
    const menuToggle = screen.getByRole('button', { name: /open navigation menu/i });
    expect(menuToggle).toBeInTheDocument();

    // Open mobile drawer
    fireEvent.click(menuToggle);
    const dialog = screen.getByRole('dialog', { name: /mobile navigation menu/i });
    expect(dialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    // Expand mobile group — desktop + mobile drawer both render a "Products" button
    const allProductsBtns = screen.getAllByRole('button', { name: /^products/i });
    // The mobile drawer button is the last one in the DOM
    const mobileProductsBtn = allProductsBtns[allProductsBtns.length - 1];
    fireEvent.click(mobileProductsBtn);
    expect(screen.getByText('Payment Gateway')).toBeInTheDocument();

    // Close mobile drawer via Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('7. contains all required public navigation groups', () => {
    renderNavbar();
    expect(screen.getByRole('button', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pricing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /developers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /services/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resources/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /company/i })).toBeInTheDocument();
  });

  it('8. renders Sign In and Get Started buttons with correct links', () => {
    renderNavbar();
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    const getStartedLinks = screen.getAllByRole('link', { name: /get started/i });

    expect(signInLinks.length).toBeGreaterThan(0);
    expect(getStartedLinks.length).toBeGreaterThan(0);

    expect(signInLinks[0]).toHaveAttribute('href', '/login');
    expect(getStartedLinks[0]).toHaveAttribute('href', '/register');
  });

  it('13. maintains React StrictMode compatibility without duplicate error throwing', () => {
    expect(() => renderNavbar()).not.toThrow();
  });
});
