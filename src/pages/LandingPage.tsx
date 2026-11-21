import { Link } from 'react-router-dom';
import { QrCode, Link2, Code2, ShieldCheck } from 'lucide-react';
import { publicPages } from '@/content/publicPages';

const products = [
  {
    title: 'A link for every sale',
    text: 'Share a hosted checkout with a customer. Follow the payment from submission to backend confirmation.',
    path: '/products/payment-links',
    icon: Link2,
  },
  {
    title: 'Your counter. Their camera.',
    text: 'Create a merchant QR, choose the amount rules, and display or print a checkout customers can scan.',
    path: '/products/qr-payments',
    icon: QrCode,
  },
  {
    title: 'Build payments into your product',
    text: 'Explore sandbox APIs, status verification and signed webhooks. Keep your payment evidence together.',
    path: '/developers/overview',
    icon: Code2,
  },
];

export default function LandingPage() {
  return (
    <main className="giantpay-home">
      <section className="gateway-hero">
        <div className="gateway-hero-copy">
          <p className="brand-eyebrow">GiantPlus / GiantPay / Malawi</p>
          <h1>
            Payments for
            <br />
            <span>the way Malawi</span>
            <br />
            does business.
          </h1>
          <p className="public-lead">{publicPages['/']!.description}</p>
          <div className="public-actions">
            <Link className="public-primary" to="/register">
              Start in the sandbox
            </Link>
            <Link className="public-secondary" to="/products/gateway">
              Explore the gateway
            </Link>
          </div>
          <p className="sandbox-note">
            <ShieldCheck size={19} aria-hidden="true" /> Sandbox testing available. Live payments
            and payouts disabled.
          </p>
        </div>
        <div className="counter-scene" aria-label="Illustrative GiantPay QR counter display">
          <p className="scene-label">FROM YOUR COUNTER TO THEIR PHONE</p>
          <div className="illustrative-stand">
            <img className="stand-logo" src="/giantpay-logo.png" alt="GiantPay official logo" />
            <span className="stand-heading">Scan. Review. Pay.</span>
            <div className="qr-illustration" aria-hidden="true">
              <QrCode strokeWidth={1} />
            </div>
            <p>
              A checkout that starts
              <br />
              with a simple scan.
            </p>
            <span className="stand-rule" />
            <span className="stand-footer">Designed for Malawian merchants</span>
          </div>
          <p className="scene-caption">Illustration only · Not a scannable payment code</p>
          <Link to="/products/qr-payments" className="scene-link">
            Discover Scan-to-Pay
          </Link>
        </div>
      </section>
      <section className="home-products">
        <div className="section-heading">
          <p className="brand-eyebrow">One gateway. Practical ways to get started.</p>
          <h2>
            Meet your customers
            <br />
            where business happens.
          </h2>
          <p>
            Test online payments, merchant QR payments and payment integration in a shared sandbox.
          </p>
        </div>
        <div className="home-product-grid">
          {products.map(({ title, text, path, icon: Icon }) => (
            <article key={path}>
              <Icon size={28} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
              <Link to={path}>
                Explore{' '}
                {path.includes('qr')
                  ? 'QR payments'
                  : path.includes('developer')
                    ? 'integration tools'
                    : 'payment links'}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="home-evidence">
        <div>
          <p className="brand-eyebrow">Clarity at every step</p>
          <h2>
            A scan starts a checkout.
            <br />
            Confirmation completes it.
          </h2>
          <p>
            A redirect, a device sound or a customer screenshot is not proof of payment. GiantPay
            uses backend-confirmed outcomes and existing ledger controls.
          </p>
          <Link to="/products/qr-payments">Understand the merchant and customer journey</Link>
        </div>
        <ol>
          {[
            'Pending — payment has not been confirmed',
            'Processing — verification is underway',
            'Successful — confirmed by the backend',
            'Failed, cancelled or expired — distinct final outcomes',
          ].map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
      </section>
      <section className="home-roadmap">
        <div className="section-heading">
          <p className="brand-eyebrow">What comes next</p>
          <h2>Useful today. Honest about tomorrow.</h2>
        </div>
        <div className="home-product-grid">
          <article>
            <span className="availability-label">Sandbox</span>
            <h3>Merchant tools</h3>
            <p>
              Payment links, QR creation, checkout states and transaction records for local testing.
            </p>
            <Link to="/services/merchant-tools">Explore merchant tools</Link>
          </article>
          <article>
            <span className="availability-label">Partner dependent</span>
            <h3>Merchant devices</h3>
            <p>
              QR displays are separate from NFC tags and contactless card terminals. Hardware
              integration awaits supplier and acquirer access.
            </p>
            <Link to="/products/merchant-devices">Explore merchant devices</Link>
          </article>
          <article>
            <span className="availability-label">Demonstration</span>
            <h3>Currency exchange</h3>
            <p>
              Try a synthetic quote journey with transparent fees and expiry. Exchange execution
              remains disabled.
            </p>
            <Link to="/products/currency-exchange">Try the quote demonstration</Link>
          </article>
        </div>
      </section>
      <section className="home-contact">
        <p className="brand-eyebrow">Built by GiantPlus</p>
        <h2>Let’s talk about your business.</h2>
        <p>Area 46, Lilongwe, Malawi</p>
        <a className="public-primary" href="mailto:info@giantplus-mw.com">
          info@giantplus-mw.com
        </a>
        <a href="https://giantplus-mw.com" rel="noreferrer">
          Visit GiantPlus
        </a>
      </section>
    </main>
  );
}
