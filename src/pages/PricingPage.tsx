import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Zap, HelpCircle, Building2 } from 'lucide-react';
import { useState } from 'react';

const HERO_BG_IMAGE =
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2000&q=80';
const HERO_BG_FALLBACK =
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=2000&q=80';

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  rate: string;
  rateDetail: string;
  description: string;
  highlights: string[];
  ctaText: string;
  ctaLink: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    badge: 'New & Small Businesses',
    rate: '1.8%',
    rateDetail: 'per successful transaction',
    description: 'Everything needed to launch and start accepting mobile payments immediately with zero upfront capital.',
    highlights: [
      'Airtel Money & TNM Mpamba mobile wallets',
      'National Switch bank transfers',
      'Hosted Payment Links & shareable URLs',
      'Full Sandbox API access with test credentials',
      'Automated T+1 settlements to Malawian banks',
      'Standard webhook notifications & event logs',
      'Email developer & operations support',
    ],
    ctaText: 'Get Started Free',
    ctaLink: '/register',
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'Most Popular',
    popular: true,
    rate: '1.5%',
    rateDetail: 'per successful transaction',
    description: 'Optimized rates and enterprise capabilities for growing digital businesses processing consistent volume.',
    highlights: [
      'Everything in Starter',
      'Visa & Mastercard digital card acceptance',
      'Lower 1.5% flat transaction rate',
      'Team member access with role-based permissions',
      'Full ledger reconciliation reports & CSV/PDF export',
      'Advanced webhook retry logic & delivery monitoring',
      'Priority live chat and dedicated support engineer',
    ],
    ctaText: 'Create Growth Account',
    ctaLink: '/register',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'High-Volume Merchants',
    rate: 'Custom',
    rateDetail: 'volume-tiered from 1.2%',
    description: 'Custom pricing, dedicated infrastructure, and treasury routing for large platforms and financial institutions.',
    highlights: [
      'Everything in Growth',
      'Volume-based interchange discounting from 1.2%',
      'Bulk payouts & automated disbursements API',
      'Custom settlement schedule (same-day or multiple daily)',
      'Dedicated integration architect & technical account manager',
      '99.99% uptime Service Level Agreement (SLA)',
      'Custom regulatory, AML & compliance reporting',
    ],
    ctaText: 'Contact Sales',
    ctaLink: 'mailto:sales@giantpay.mw',
  },
];

const CHANNELS = [
  {
    name: 'Airtel Money',
    type: 'Mobile Wallet',
    rate: '1.8%',
    settlement: 'T+1 Bank Transfer',
    logo: '/brands/airtel-money.svg',
    color: 'bg-red-50 text-red-600 border-red-200',
  },
  {
    name: 'TNM Mpamba',
    type: 'Mobile Wallet',
    rate: '1.8%',
    settlement: 'T+1 Bank Transfer',
    logo: '/brands/tnm-mpamba.svg',
    color: 'bg-green-50 text-green-600 border-green-200',
  },
  {
    name: 'Visa & Mastercard',
    type: 'Credit & Debit Cards',
    rate: '2.2%',
    settlement: 'T+1 Bank Transfer',
    logo: '/brands/visa.svg',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    name: 'National Switch',
    type: 'Bank Clearing',
    rate: '1.5%',
    settlement: 'Direct Account Clearing',
    logo: '',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
];

const PRICING_FAQS = [
  {
    q: 'Are there any setup or monthly subscription fees?',
    a: 'None whatsoever. GiantPay operates on a purely transactional basis: you only pay a small flat percentage when you successfully receive a payment. There are 0 MWK setup fees, 0 MWK monthly maintenance charges, and no hidden surprises.',
  },
  {
    q: 'How and when are transaction fees deducted?',
    a: 'Fees are calculated and deducted automatically by the backend ledger at the moment of payment confirmation. If a customer abandons a transaction or a payment fails, you are never charged anything.',
  },
  {
    q: 'How does settlement to my bank account work?',
    a: 'Net funds from reconciled transactions are batched and settled automatically to your registered Malawian business bank account on a T+1 (next business day) schedule, fully reconciled against official provider records.',
  },
  {
    q: 'Can I test all payment channels before going live?',
    a: 'Yes! Every registered user gains immediate access to the GiantPay sandbox environment. You can simulate mobile money USSD prompts, card authorizations, webhook delivery, and refund flows completely free of charge.',
  },
  {
    q: 'Can I get a volume discount if my transaction volume increases?',
    a: 'Yes. Once your monthly processed volume exceeds MWK 25,000,000, our system automatically unlocks Growth tier pricing, and our sales team can negotiate custom Enterprise tiers with rates scaling down to 1.2%.',
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* ── Hero Section with Highly Visible Background Image Layer ── */}
      <section className="relative isolate flex min-h-[480px] items-center overflow-hidden bg-white pt-24 pb-16 lg:pt-32 lg:pb-24">
        {/* Background Image Layer — clearly and prominently visible */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src={HERO_BG_IMAGE}
            onError={(e) => {
              e.currentTarget.src = HERO_BG_FALLBACK;
            }}
            alt=""
            className="h-full w-full object-cover object-[75%_center] opacity-45 sm:opacity-55"
            style={{
              filter: 'contrast(1.08) brightness(1.02)',
            }}
          />
          {/* Subtle overlay keeping the background photo rich and clear while keeping text readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white" />
        </div>

        {/* Ambient decorative elements */}
        <div aria-hidden="true" className="grid-bg absolute inset-0 opacity-60 pointer-events-none" />
        <div aria-hidden="true" className="hero-glow absolute inset-0 pointer-events-none" />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-[#1B4FD8]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="mx-auto max-w-3xl text-center">


            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Simple, fair pricing.{' '}
              <span className="bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400 bg-clip-text text-transparent">
                No hidden fees.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600">
              Only pay when you get paid. Scale seamlessly from your first transaction to enterprise volumes with
              transparent package rates, zero monthly maintenance, and automated settlement.
            </p>

            {/* Quick Guarantees */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs sm:text-sm font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 font-bold" /> 0 MWK Setup Fee
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 font-bold" /> 0 MWK Monthly Fee
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 font-bold" /> Free Unlimited Sandbox
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 font-bold" /> T+1 Bank Payouts
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Packages (Tiers with %) ── */}
      <section className="relative z-10 -mt-8 pb-20 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3 lg:items-stretch">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={[
                  'relative flex flex-col justify-between rounded-3xl border bg-white p-8 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl',
                  tier.popular
                    ? 'border-[#1B4FD8] ring-2 ring-[#1B4FD8]/20 shadow-blue-500/10'
                    : 'border-slate-200 shadow-slate-100',
                ].join(' ')}
              >
                {/* Popular Pill */}
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#1B4FD8] px-4 py-1 text-xs font-bold text-white shadow-md">
                    {tier.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">{tier.name}</h2>
                    {!tier.popular && tier.badge && (
                      <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">
                        {tier.badge}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-500 leading-relaxed min-h-[40px]">
                    {tier.description}
                  </p>

                  {/* Percentage Rate Display */}
                  <div className="mt-6 border-t border-b border-slate-100 py-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                        {tier.rate}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{tier.rateDetail}</span>
                    </div>
                  </div>

                  {/* Feature Highlights list */}
                  <div className="mt-6 space-y-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Included features</p>
                    {tier.highlights.map((feat) => (
                      <div key={feat} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                        <Check className="h-4 w-4 shrink-0 text-[#1B4FD8] mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to action */}
                <div className="mt-8 pt-4">
                  {tier.ctaLink.startsWith('mailto:') ? (
                    <a
                      href={tier.ctaLink}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      {tier.ctaText} <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to={tier.ctaLink}
                      className={[
                        'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition shadow-sm',
                        tier.popular
                          ? 'bg-[#1B4FD8] text-white shadow-blue-500/25 hover:bg-[#1744b9]'
                          : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      {tier.ctaText} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Per-Channel Rate Breakdown Matrix ── */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Payment Channels</p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Transparent rates per channel
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-500">
              Clear transaction fees across all Malawian mobile money operators and digital card networks.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map((ch) => (
              <div
                key={ch.name}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-[#1B4FD8]/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={['flex h-10 w-10 items-center justify-center rounded-xl border font-bold text-sm', ch.color].join(' ')}>
                      {ch.logo ? (
                        <img src={ch.logo} alt={ch.name} className="max-h-5 max-w-7 object-contain" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-xl font-extrabold text-[#1B4FD8]">{ch.rate}</span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-900">{ch.name}</h3>
                  <p className="text-xs font-medium text-slate-400">{ch.type}</p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Payout cycle:</span>
                    <span className="font-semibold text-slate-700">{ch.settlement}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise & Custom Integrations Banner ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-8 sm:p-12 lg:p-16 text-white">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                <Zap className="h-3.5 w-3.5" /> High Volume Solutions
              </div>
              <h2 className="mt-6 text-3xl font-extrabold sm:text-4xl">Processing over MWK 50M monthly?</h2>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                Connect directly with our engineering and treasury leadership to access custom interchange pricing,
                same-day settlement batches, and specialized enterprise API rate limits.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="mailto:sales@giantpay.mw?subject=Enterprise%20Volume%20Inquiry"
                  className="rounded-xl bg-[#1B4FD8] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9]"
                >
                  Request Enterprise Quote
                </a>
                <Link
                  to="/developers"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
                >
                  Explore Developer API
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing FAQs ── */}
      <section className="border-t border-slate-100 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
              <HelpCircle className="h-4 w-4" /> FAQ
            </div>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Pricing questions answered</h2>
            <p className="mt-4 text-sm sm:text-base text-slate-500">
              Everything you need to know about transaction costs, settlements, and compliance.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {PRICING_FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 p-6 text-left font-semibold text-slate-900"
                  >
                    <span className="text-base">{faq.q}</span>
                    <span
                      className={[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-transform duration-200',
                        isOpen ? 'rotate-45 border-[#1B4FD8] bg-[#1B4FD8] text-white' : 'border-slate-200 text-slate-400',
                      ].join(' ')}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm leading-relaxed text-slate-600 border-t border-slate-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
