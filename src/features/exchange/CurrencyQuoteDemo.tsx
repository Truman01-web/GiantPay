import { useEffect, useState } from 'react';
import {
  createDemoQuote,
  demoCurrencies,
  demoQuoteStatus,
  formatDemoMinor,
  type DemoCurrency,
} from './demoQuote';

export function CurrencyQuoteDemo() {
  const [from, setFrom] = useState<DemoCurrency>('MWK');
  const [to, setTo] = useState<DemoCurrency>('USD');
  const [amount, setAmount] = useState('20000.00');
  const [quote, setQuote] = useState<ReturnType<typeof createDemoQuote> | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!quote) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [quote]);
  function invalidate() {
    setQuote(null);
    setError('');
  }
  return (
    <section className="quote-demo" aria-labelledby="quote-demo-title">
      <h2 id="quote-demo-title">Try a demonstration quote</h2>
      <p className="demo-warning">Synthetic rates and fees · No live offer · No funds move</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const timestamp = Date.now();
            setNow(timestamp);
            setQuote(createDemoQuote(amount, from, to, timestamp));
            setError('');
          } catch (cause) {
            setQuote(null);
            setError(
              cause instanceof Error ? cause.message : 'Unable to calculate this demonstration.',
            );
          }
        }}
      >
        <div className="quote-fields">
          <label>
            Source currency
            <select
              value={from}
              onChange={(event) => {
                setFrom(event.target.value as DemoCurrency);
                invalidate();
              }}
            >
              {demoCurrencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <label>
            Destination currency
            <select
              value={to}
              onChange={(event) => {
                setTo(event.target.value as DemoCurrency);
                invalidate();
              }}
            >
              {demoCurrencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <label>
            Source amount
            <input
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                invalidate();
              }}
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'quote-error' : undefined}
            />
          </label>
        </div>
        <button className="public-primary" type="submit">
          Calculate demonstration quote
        </button>
        {error && (
          <p id="quote-error" role="alert">
            {error}
          </p>
        )}
      </form>
      {quote && (
        <div className="quote-result" aria-live="polite">
          <h3>Synthetic demonstration — not executable</h3>
          <dl>
            <div>
              <dt>Source amount</dt>
              <dd>
                {formatDemoMinor(quote.sourceMinor)} {quote.from}
              </dd>
            </div>
            <div>
              <dt>Synthetic rate</dt>
              <dd>
                1 {quote.from} = {quote.rate} {quote.to}
              </dd>
            </div>
            <div>
              <dt>Illustrative fee (1.50%, added to source)</dt>
              <dd>
                {formatDemoMinor(quote.feeMinor)} {quote.from}
              </dd>
            </div>
            <div>
              <dt>Total source debit (illustration)</dt>
              <dd>
                {formatDemoMinor(quote.totalMinor)} {quote.from}
              </dd>
            </div>
            <div>
              <dt>Destination amount (rounded to 2 decimals)</dt>
              <dd>
                {formatDemoMinor(quote.destinationMinor)} {quote.to}
              </dd>
            </div>
            <div>
              <dt>Demonstration expires</dt>
              <dd>
                <time dateTime={new Date(quote.expiresAt).toISOString()}>
                  {new Date(quote.expiresAt).toLocaleTimeString()}
                </time>{' '}
                (60 seconds)
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {demoQuoteStatus(quote.expiresAt, now) === 'EXPIRED'
                  ? 'Expired — recalculate for another demonstration'
                  : 'Demonstration ready — execution disabled'}
              </dd>
            </div>
          </dl>
        </div>
      )}
      <button
        className="public-secondary"
        type="button"
        disabled
        aria-describedby="execution-disabled"
      >
        Exchange execution disabled
      </button>
      <p id="execution-disabled">
        Requires an approved provider, documented contract and account eligibility. This
        demonstration has no exchange API connection.
      </p>
    </section>
  );
}
