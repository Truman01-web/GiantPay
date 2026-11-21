import { Link, useLocation } from 'react-router-dom';
import { publicPages } from '@/content/publicPages';
import { CurrencyQuoteDemo } from '@/features/exchange/CurrencyQuoteDemo';
import { PageHero } from '@/components/hero';

export default function PublicFeaturePage() {
  const { pathname } = useLocation();
  const content = publicPages[pathname];
  if (!content)
    return (
      <main className="public-content">
        <h1>Page not found</h1>
        <Link to="/">Return to GiantPay</Link>
      </main>
    );
  return (
    <main className="public-content">
      <PageHero
        className="product-intro"
        padding="pb-12"
        containerClassName=""
        backLink={{ to: '/', label: 'GiantPay / Products & resources' }}
        eyebrow={content.eyebrow}
        description={content.description}
      >
        {content.title}
      </PageHero>
      {pathname === '/products/merchant-devices' && (
        <figure className="device-reference">
          <img
            src="/devices/aisino-reference.png"
            alt="Supplied Aisino counter device photograph with QR display and separate keypad unit"
            width="970"
            height="706"
          />
          <figcaption>
            Supplier reference photograph supplied for design direction. No GiantPay hardware,
            supplier relationship or card-processing capability is implied.
          </figcaption>
        </figure>
      )}
      {pathname === '/products/currency-exchange' && <CurrencyQuoteDemo />}
      {pathname === '/products/currency-exchange' && (
        <p className="mt-4 text-sm">
          Provider references:{' '}
          <a className="underline" href="https://flutterwave.com/us/swap">
            Flutterwave Swap FAQ
          </a>{' '}
          ·{' '}
          <a className="underline" href="https://developer.flutterwave.com/docs/fx">
            FX API documentation
          </a>
          . Reviewed 19 November 2026; GiantPlus account eligibility has not been confirmed.
        </p>
      )}
      <div className="product-sections">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
      <aside className="public-next">
        <h2>Take the next step</h2>
        <div className="public-actions">
          <Link
            className="public-primary"
            to={pathname === '/products/qr-payments' ? '/scan-to-pay' : '/register'}
          >
            {pathname === '/products/qr-payments'
              ? 'Open merchant Scan to Pay'
              : 'Create a sandbox account'}
          </Link>
          <Link className="public-secondary" to="/developers/api-documentation">
            Read API documentation
          </Link>
          <a href="mailto:info@giantplus-mw.com">Email GiantPlus</a>
        </div>
      </aside>
    </main>
  );
}
