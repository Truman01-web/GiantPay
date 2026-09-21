import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, FileCheck, CheckCircle2, Clock } from 'lucide-react';

export default function TermsPage() {
  const lastUpdated = 'September 2026';

  const sections = [
    {
      id: 'agreement',
      title: '1. Merchant Agreement & Acceptance',
      content: (
        <div className="space-y-3">
          <p>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between GiantPlus Ltd
            (&quot;GiantPlus&quot;, &quot;GiantPay&quot;, &quot;we&quot;, or &quot;us&quot;) and the entity or individual
            (&quot;Merchant&quot;, &quot;you&quot;) registering for or utilizing GiantPay payment gateway services.
          </p>
          <p>
            By creating a GiantPay merchant account, generating API credentials, integrating payment links, or
            initiating transactions, you acknowledge that you have read, understood, and agree to be bound by these
            Terms and all applicable financial regulations issued by the Reserve Bank of Malawi (RBM).
          </p>
        </div>
      ),
    },
    {
      id: 'onboarding-kyc',
      title: '2. Merchant Eligibility & Verification (KYC/KYB)',
      content: (
        <div className="space-y-3">
          <p>
            To use GiantPay in live production mode, merchants must complete mandatory Know Your Customer (KYC) and
            Know Your Business (KYB) compliance verification. You agree to provide accurate and up-to-date documentation,
            including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Valid Certificate of Incorporation or Business Name Registration in Malawi.</li>
            <li>Taxpayer Identification Number (TPIN) Certificate from the Malawi Revenue Authority (MRA).</li>
            <li>National Identity cards or Passports for all directors and ultimate beneficial owners holding &gt;10% equity.</li>
            <li>Verification of a registered business commercial bank account located within Malawi for settlement.</li>
          </ul>
          <p className="text-xs text-slate-500 italic">
            Sandbox test environments are provided without full verification, but no real monetary transfers can take place in sandbox mode.
          </p>
        </div>
      ),
    },
    {
      id: 'payment-channels',
      title: '3. Payment Services & Processing Channels',
      content: (
        <div className="space-y-3">
          <p>
            GiantPay provides unified integration infrastructure allowing merchants to accept customer payments via:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">Mobile Money</h4>
              <p className="mt-1 text-xs text-slate-500">
                Airtel Money and TNM Mpamba wallet debit transactions processed via telco provider push and USSD prompts.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">Payment Cards</h4>
              <p className="mt-1 text-xs text-slate-500">
                Visa and Mastercard credit and debit card transactions authenticated via 3D-Secure standards.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">Bank Transfers</h4>
              <p className="mt-1 text-xs text-slate-500">
                Direct interbank settlements routed through the National Switch system.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">Disbursements &amp; Payouts</h4>
              <p className="mt-1 text-xs text-slate-500">
                Automated bulk payouts to mobile wallets and commercial bank accounts in Malawi Kwacha (MWK).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'fees-settlement',
      title: '4. Fees, Deductions & Settlement Payouts',
      content: (
        <div className="space-y-3">
          <p>
            GiantPay applies transparent, pre-agreed transaction fees as displayed in our pricing schedule (standard
            flat rate starting from 1.8% per successful transaction). There are zero monthly subscription fees or setup
            costs for standard merchant accounts.
          </p>
          <div className="space-y-2 text-slate-600">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
              <span>
                <strong>Net Settlement:</strong> GiantPay automatically deducts applicable processing fees at transaction
                initiation and credits the net amount to your settlement balance.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
              <span>
                <strong>Payout Timing (T+1):</strong> Standard settlements are released to your verified Malawian bank
                account within one (1) business day following transaction settlement.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
              <span>
                <strong>Rolling Reserve:</strong> Depending on merchant risk profile and dispute velocity, GiantPay may
                maintain a temporary rolling security reserve of up to 5% for high-risk product categories.
              </span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'refunds-chargebacks',
      title: '5. Refunds, Chargebacks & Disputes',
      content: (
        <div className="space-y-3">
          <p>
            Merchants may initiate transaction refunds through the GiantPay dashboard or Refunds API, subject to
            adequate available merchant balances. Original transaction processing fees are non-refundable.
          </p>
          <p>
            In the event of a customer dispute or fraudulent transaction claim through a card scheme or mobile
            operator, the merchant is responsible for supplying proof of delivery or service fulfillment within five (5)
            business days. If a dispute is decided against the merchant, the disputed funds plus any provider chargeback
            levies will be debited from the merchant settlement account.
          </p>
        </div>
      ),
    },
    {
      id: 'prohibited-activities',
      title: '6. Acceptable Use Policy',
      content: (
        <div className="space-y-3">
          <p>
            You agree not to use GiantPay to facilitate transactions for unlawful activities or prohibited categories,
            including but not limited to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Unlicensed gambling, betting, or binary options not sanctioned under Malawian gaming law.</li>
            <li>Counterfeit merchandise, pirated intellectual property, or unlicensed pharmaceutical sales.</li>
            <li>Multi-level marketing schemes, pyramid investments, or deceptive enrichment offers.</li>
            <li>Cryptocurrency trading without specific prior written regulatory authorization.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'governing-law',
      title: '7. Governing Law & Dispute Resolution',
      content: (
        <div className="space-y-3">
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of Malawi. Any dispute
            arising out of or in connection with these Terms shall first be resolved amicably through good-faith
            negotiations between the parties within thirty (30) days.
          </p>
          <p>
            If unresolved, the dispute shall be referred to arbitration in Lilongwe, Malawi, under the Arbitration Act
            of Malawi.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Header */}
      <section className="relative overflow-hidden text-white pt-28 pb-14 sm:pt-36 sm:pb-16 bg-[#061428]">
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=2000&q=80"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=2000&q=80";
            }}
            alt=""
            className="h-full w-full object-cover object-center opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061428] via-[#061428]/90 to-[#0B2445]/85" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#061428]/80 via-transparent to-[#061428]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
            <Scale className="h-4 w-4" />
            <span>Merchant Agreement</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-white">Terms of Service</h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Legal terms governing merchant accounts, digital payment processing, automated settlements, and acceptable platform use.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Effective date: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="space-y-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-950">
            These terms currently govern sandbox use only. Production terms still require GiantPlus legal and compliance
            approval, and sandbox access does not activate live payment, payout, email, SMS, settlement, or provider services.
          </div>
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-900 pb-3 border-b border-slate-100">
                {section.title}
              </h2>
              <div className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info box */}
        <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Ready to accept payments?</p>
              <p className="text-xs text-slate-500">Sign up in 2 minutes and start testing in our free sandbox.</p>
            </div>
          </div>
          <Link
            to="/register"
            className="shrink-0 rounded-xl bg-[#1B4FD8] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            Create Sandbox Account
          </Link>
        </div>
      </main>
    </div>
  );
}
