import { Link } from 'react-router-dom';
import { ArrowRight, Check, HelpCircle, Building2, Smartphone, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { PublicPageHero } from '@/components/marketing/PublicPageHero';

/*
 * Confirmed GiantPay transaction rates (commercial approval on file):
 *   - Account/setup fee:  none
 *   - Monthly/platform fee:  none
 *   - Airtel Money & TNM Mpamba collections:  3 % per successful transaction
 *   - Bank-transfer (National Switch) collections:  2 % per successful transaction
 *   - Card payments (Visa / Mastercard):  3 % per successful transaction
 *
 * Do NOT add tiered discounts, volume thresholds or settlement guarantees
 * until they are commercially confirmed.  Settlement timing is stated as a
 * sandbox target only.
 */

const HERO_BG =
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2000&q=80';
const HERO_BG_FALLBACK =
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=2000&q=80';

interface Channel {
  id: string;
  name: string;
  type: string;
  rate: string;
  rateNote?: string;
  settlement: string;
  settlementNote?: string;
  icon: 'mobile' | 'card' | 'bank';
  status: 'sandbox' | 'planned';
  statusLabel: string;
}

const CHANNELS: Channel[] = [
  {
    id: 'airtel',
    name: 'Airtel Money',
    type: 'Mobile Wallet',
    rate: '3%',
    rateNote: 'per successful transaction',
    settlement: 'T+1 (sandbox target)',
    settlementNote: 'Sandbox accounting only — no live settlement',
    icon: 'mobile',
    status: 'sandbox',
    statusLabel: 'Integration pending provider approval',
  },
  {
    id: 'tnm',
    name: 'TNM Mpamba',
    type: 'Mobile Wallet',
    rate: '3%',
    rateNote: 'per successful transaction',
    settlement: 'T+1 (sandbox target)',
    settlementNote: 'Sandbox accounting only — no live settlement',
    icon: 'mobile',
    status: 'sandbox',
    statusLabel: 'Integration pending provider approval',
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    type: 'National Switch',
    rate: '2%',
    rateNote: 'per successful transaction',
    settlement: 'Direct account clearing (sandbox target)',
    settlementNote: 'Sandbox accounting only — no live settlement',
    icon: 'bank',
    status: 'sandbox',
    statusLabel: 'Integration pending bank connectivity',
  },
  {
    id: 'card',
    name: 'Visa & Mastercard',
    type: 'Credit & Debit Cards',
    rate: '3%',
    rateNote: 'per successful transaction',
    settlement: 'T+1 (sandbox target)',
    settlementNote: 'Sandbox accounting only — no live settlement',
    icon: 'card',
    status: 'planned',
    statusLabel: 'Planned — card API access pending',
  },
];

const PRICING_FAQS = [
  {
    q: 'Are there any setup or monthly subscription fees?',
    a: 'No. GiantPay has no account setup fee, no monthly platform fee, and no minimum volume requirement. You only pay a small percentage when you successfully receive a payment. If a customer abandons a transaction or a payment fails, you are not charged anything.',
  },
  {
    q: 'What are the exact transaction rates?',
    a: 'Airtel Money and TNM Mpamba mobile wallet collections: 3% per successful transaction. Bank transfers via National Switch: 2% per successful transaction. Visa and Mastercard card payments: 3% per successful transaction. These are the confirmed rates at commercial approval. All deductions are shown in your dashboard ledger.',
  },
  {
    q: 'How and when are transaction fees deducted?',
    a: 'Fees are calculated automatically at the moment of payment confirmation and deducted before funds are batched for settlement. Your dashboard shows gross transaction value, fee amount, and net settlement amount for every transaction.',
  },
  {
    q: 'How does settlement work?',
    a: 'In the current sandbox environment, settlement batches are generated for accounting and reconciliation testing — no real funds move. Target production settlement cycle is T+1 (next business day) to your registered Malawian business bank account, subject to reconciliation against official provider records. Settlement terms will be confirmed in your merchant agreement before going live.',
  },
  {
    q: 'Can I test all payment channels before going live?',
    a: 'Yes. Every registered merchant gets immediate sandbox access at no charge. You can simulate Airtel Money and TNM Mpamba wallet prompts, bank transfer flows, webhook delivery, and refund processing. Sandbox credentials are separate from production and cannot initiate real financial transactions.',
  },
  {
    q: 'Are Visa and Mastercard available now?',
    a: 'Card payment processing is planned and the API surface is documented in the sandbox, but it is not yet available for live transactions. Card API access is pending approval from our card scheme partners. We will communicate availability to registered merchants directly.',
  },
  {
    q: 'Are Airtel Money and TNM Mpamba available now?',
    a: 'Mobile money channels are integrated in the sandbox environment for testing. Live collection capability is pending final provider approval and will be enabled once integration agreements are in place. We will notify registered merchants when each channel is activated.',
  },
];

function ChannelIcon({ icon }: { icon: Channel['icon'] }) {
  if (icon === 'mobile') return <Smartphone className="h-5 w-5" aria-hidden />;
  if (icon === 'card') return <CreditCard className="h-5 w-5" aria-hidden />;
  return <Building2 className="h-5 w-5" aria-hidden />;
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <PublicPageHero
        badge="Pricing · Transparent Rates"
        title="Simple, transparent"
        titleAccent="pricing for every merchant."
        description="No setup fees. No monthly charges. Pay a flat percentage only on successful transactions — with clear, confirmed rates for every payment channel."
        heroBgUrl={HERO_BG}
        heroBgFallback={HERO_BG_FALLBACK}
        align="center"
        actions={
          <>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-blue-600)] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--color-blue-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-600)]"
            >
              Create Free Account <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href="mailto:sales@giantpay.mw?subject=Pricing%20Enquiry"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-navy-800)] transition hover:bg-[var(--color-neutral-100)]"
            >
              Talk to Sales
            </a>
          </>
        }
      />

      {/* Quick guarantees bar */}
      <section className="border-y border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <dl className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-[var(--color-navy-700)]">
            {[
              'No setup fee',
              'No monthly fee',
              'Pay only on success',
              'Free unlimited sandbox',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--color-green-600)]" aria-hidden />
                <span>{item}</span>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Per-channel rate table */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[var(--color-blue-600)]">
              Payment Channels
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-navy-950)] sm:text-4xl">
              Confirmed rates per channel
            </h2>
            <p className="mt-4 text-[var(--color-neutral-600)]">
              These are the commercially confirmed transaction rates. All channels are
              available for sandbox testing. Live availability is noted per channel below.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map((ch) => (
              <div
                key={ch.id}
                className="flex flex-col rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 shadow-[var(--shadow-card)] transition hover:border-[var(--color-blue-300)] hover:shadow-[var(--shadow-popover)]"
              >
                {/* Icon + rate row */}
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-blue-100)] bg-[var(--color-blue-50)] text-[var(--color-blue-600)]">
                    <ChannelIcon icon={ch.icon} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-[var(--color-blue-600)]">{ch.rate}</p>
                    <p className="text-[10px] text-[var(--color-neutral-500)]">{ch.rateNote}</p>
                  </div>
                </div>

                {/* Channel name + type */}
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-[var(--color-navy-900)]">{ch.name}</h3>
                  <p className="text-xs text-[var(--color-neutral-500)]">{ch.type}</p>
                </div>

                {/* Settlement */}
                <div className="mt-4 border-t border-[var(--color-neutral-200)] pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-500)]">
                    Settlement
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--color-navy-700)]">{ch.settlement}</p>
                </div>

                {/* Live status label */}
                <div className="mt-3">
                  <span
                    className={[
                      'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                      ch.status === 'planned'
                        ? 'bg-[var(--color-amber-100)] text-[var(--color-amber-700)]'
                        : 'bg-[var(--color-blue-50)] text-[var(--color-blue-600)]',
                    ].join(' ')}
                  >
                    {ch.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sandbox note */}
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-[var(--color-neutral-500)]">
            All channels are available for sandbox testing with simulated transaction flows.
            Live payment execution requires provider approval, which is in progress.
            Settlement figures in the sandbox are accounting entries only — no real funds move.
          </p>
        </div>
      </section>

      {/* What you pay / What you don't pay */}
      <section className="border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* What you pay */}
            <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 shadow-[var(--shadow-card)]">
              <h2 className="text-xl font-extrabold text-[var(--color-navy-950)]">What you pay</h2>
              <p className="mt-2 text-sm text-[var(--color-neutral-600)]">
                One simple charge per successful payment collected.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  { label: 'Airtel Money collection', rate: '3% per successful transaction' },
                  { label: 'TNM Mpamba collection', rate: '3% per successful transaction' },
                  { label: 'Bank transfer (National Switch)', rate: '2% per successful transaction' },
                  {
                    label: 'Visa / Mastercard (Planned)',
                    rate: '3% per successful transaction',
                    planned: true,
                  },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-4 border-b border-[var(--color-neutral-200)] pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy-900)]">{item.label}</p>
                      {'planned' in item && item.planned && (
                        <span className="mt-1 inline-block rounded-full bg-[var(--color-amber-100)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-amber-700)]">
                          Planned
                        </span>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold text-[var(--color-blue-600)]">{item.rate}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* What you don't pay */}
            <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 shadow-[var(--shadow-card)]">
              <h2 className="text-xl font-extrabold text-[var(--color-navy-950)]">What you don&apos;t pay</h2>
              <p className="mt-2 text-sm text-[var(--color-neutral-600)]">
                No hidden charges — ever.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  'Account setup or onboarding fee',
                  'Monthly platform or subscription fee',
                  'Failed or abandoned transaction fee',
                  'Sandbox API access fee',
                  'Refund processing fee',
                  'Dashboard or reporting access fee',
                  'API key or webhook registration fee',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 border-b border-[var(--color-neutral-200)] pb-4 last:border-0 last:pb-0"
                  >
                    <Check
                      className="h-4 w-4 shrink-0 text-[var(--color-green-600)]"
                      aria-hidden
                    />
                    <span className="text-sm text-[var(--color-navy-800)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise contact */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-navy-800)] bg-[var(--color-navy-950)] p-8 text-white sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Processing high volumes?
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
                If you expect consistently high monthly transaction volumes, contact our
                team to discuss your use case. Any commercial arrangement beyond the
                published rates requires a signed merchant agreement.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="mailto:sales@giantpay.mw?subject=High%20Volume%20Pricing%20Enquiry"
                  className="rounded-xl bg-[var(--color-blue-600)] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--color-blue-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-400)]"
                >
                  Contact Sales
                </a>
                <Link
                  to="/developers/overview"
                  className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white/90 transition hover:bg-white/10"
                >
                  Explore Developer API
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--color-neutral-200)] bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[var(--color-blue-600)]">
              <HelpCircle className="h-4 w-4" aria-hidden />
              FAQ
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--color-navy-950)] sm:text-4xl">
              Pricing questions answered
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {PRICING_FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-[var(--color-neutral-200)] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 p-6 text-left font-semibold text-[var(--color-navy-900)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-600)]"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    <span
                      aria-hidden
                      className={[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-base font-bold transition-transform duration-[var(--duration-base)]',
                        isOpen
                          ? 'rotate-45 border-[var(--color-blue-600)] bg-[var(--color-blue-600)] text-white'
                          : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-500)]',
                      ].join(' ')}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[var(--color-neutral-200)] px-6 pt-4 pb-6 text-sm leading-relaxed text-[var(--color-neutral-600)]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-navy-950)] sm:text-4xl">
            Ready to accept payments?
          </h2>
          <p className="mt-4 text-[var(--color-neutral-600)]">
            Create a free account and start testing in the sandbox today. No payment
            details required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className="rounded-xl bg-[var(--color-blue-600)] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--color-blue-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-600)]"
            >
              Create Free Account
            </Link>
            <Link
              to="/company/contact"
              className="rounded-xl border border-[var(--color-neutral-200)] bg-white px-8 py-4 text-sm font-bold text-[var(--color-navy-800)] transition hover:bg-[var(--color-neutral-100)]"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
