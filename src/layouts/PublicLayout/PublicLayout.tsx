import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { PublicNavbar } from '@/components/navigation/PublicNavbar';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';

export function PublicLayout() {
  return (
    <div className="public-shell">
      <a href="#public-main" className="public-skip">
        Skip to content
      </a>
      <PublicNavbar />
      <div id="public-main" tabIndex={-1}>
        <ErrorBoundary boundaryName="Public page">
          <Suspense fallback={<FullPageLoader label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      <footer className="public-footer">
        <div>
          <Link to="/">
            <img src="/giantpay-logo.png" alt="GiantPay" width="180" />
          </Link>
          <p>
            A payment gateway for Malawian businesses.
            <br />A GiantPlus product. Sandbox only.
          </p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link to="/products/gateway">Payment gateway</Link>
          <Link to="/products/qr-payments">QR payments</Link>
          <Link to="/products/merchant-devices">Merchant devices</Link>
          <Link to="/products/currency-exchange">Exchange demo</Link>
          <Link to="/developers/overview">Developers</Link>
        </div>
        <div>
          <h2>GiantPlus</h2>
          <p>Area 46, Lilongwe, Malawi</p>
          <a href="mailto:info@giantplus-mw.com">info@giantplus-mw.com</a>
          <a href="https://giantplus-mw.com">giantplus-mw.com</a>
          <p>Product: giantpay.mw</p>
        </div>
        <nav aria-label="Footer legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/company/compliance">Readiness</Link>
          <Link to="/company/contact">Contact</Link>
          <p>© {new Date().getFullYear()} GiantPlus</p>
        </nav>
      </footer>
    </div>
  );
}
