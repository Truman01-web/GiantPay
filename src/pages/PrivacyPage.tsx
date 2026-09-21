import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, CheckCircle2, Clock } from 'lucide-react';

export default function PrivacyPage() {
  const lastUpdated = 'September 2026';

  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction & Scope',
      content: (
        <div className="space-y-3">
          <p>
            GiantPlus Ltd (&quot;GiantPlus&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operating the
            <strong> GiantPay</strong> unified payment platform, is committed to safeguarding the privacy,
            confidentiality, and security of all personal, business, and transactional data entrusted to us.
          </p>
          <p>
            This Privacy Policy governs our collection, processing, storage, and sharing of information across all
            GiantPay services, hosted checkout flows, merchant APIs, and digital applications in compliance with the
            laws of Malawi, including Reserve Bank of Malawi (RBM) directives and applicable data protection standards.
          </p>
        </div>
      ),
    },
    {
      id: 'information-collected',
      title: '2. Information We Collect',
      content: (
        <div className="space-y-3">
          <p>To provide compliant and reliable financial payment services, we collect information in three main categories:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>
              <strong>Merchant &amp; Business Profile Information:</strong> Business registration certificates, tax
              identification numbers (TPIN), registered physical addresses, beneficial ownership records, director
              identification documents, and authorized representative contact details (KYC/KYB compliance).
            </li>
            <li>
              <strong>Transactional Data:</strong> Payment amounts, currency denominations (MWK), transaction timestamps,
              merchant references, payer phone numbers (for Airtel Money and TNM Mpamba), masked card identifiers (first 6
              and last 4 digits only), settlement bank account numbers, and reconciliation logs.
            </li>
            <li>
              <strong>Technical &amp; Telemetry Data:</strong> IP addresses, browser user-agents, device fingerprints, API
              request signatures, webhook delivery telemetry, and session logs used strictly for fraud prevention and
              system diagnostics.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'how-we-use',
      title: '3. How We Use Your Information',
      content: (
        <div className="space-y-3">
          <p>We process collected data solely for lawful financial and operational purposes, specifically:</p>
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">Payment Execution</h4>
              <p className="mt-1 text-xs text-slate-500">
                Routing payment instructions to telecommunications operators, card networks, and the National Switch.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">AML/CFT Compliance</h4>
              <p className="mt-1 text-xs text-slate-500">
                Fulfilling Anti-Money Laundering and Counter-Financing of Terrorism verification required by Malawian regulators.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">Reconciliation &amp; Settlement</h4>
              <p className="mt-1 text-xs text-slate-500">
                Auditing funds received against provider ledgers to calculate and disburse merchant net payouts.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="font-bold text-slate-800 text-sm">Fraud &amp; Risk Mitigation</h4>
              <p className="mt-1 text-xs text-slate-500">
                Detecting unusual patterns, velocity anomalies, unauthorized access attempts, and chargeback disputes.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'data-sharing',
      title: '4. Information Sharing & Third Parties',
      content: (
        <div className="space-y-3">
          <p>
            <strong>We do not sell, rent, or monetize your personal or financial data.</strong> Data is only shared with
            authorized entities necessary to complete payment fulfillment:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Licensed Mobile Money Operators (Airtel Malawi, TNM Mpamba) to process mobile wallet debits.</li>
            <li>Card Processing Schemes (Visa, Mastercard) and acquiring banking partners for card authorization.</li>
            <li>National Switch / Clearing House operators for interbank electronic transfers.</li>
            <li>Statutory regulatory bodies and law enforcement agencies when legally required by valid judicial order.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'security-measures',
      title: '5. Data Protection & Security Standards',
      content: (
        <div className="space-y-3">
          <p>
            GiantPay implements industry-grade protective controls to safeguard financial records against interception,
            loss, and unauthorized alteration:
          </p>
          <div className="space-y-2 text-slate-600">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-1 shrink-0" />
              <span>
                <strong>Encryption in Transit &amp; At Rest:</strong> All external API communications require TLS 1.3
                encryption. Database records and backups are secured using AES-256 standards.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-1 shrink-0" />
              <span>
                <strong>Zero Card Storage:</strong> GiantPay does not store full 16-digit card numbers or CVV/CVC codes on
                its application servers. Tokenization is managed through certified payment gateways.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-1 shrink-0" />
              <span>
                <strong>Role-Based Access Control:</strong> Internal system access is strictly restricted on a
                need-to-know basis, protected by multi-factor authentication and immutable audit logs.
              </span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'retention-rights',
      title: '6. Data Retention & Merchant Rights',
      content: (
        <div className="space-y-3">
          <p>
            In accordance with Malawian financial regulations, transaction and KYC records must be retained for a
            minimum of seven (7) years following account closure for statutory audit trails.
          </p>
          <p>
            You have the right to request access to your registered business profile, rectify inaccurate records, export
            historical transaction ledgers, and request termination of your merchant processing agreement.
          </p>
        </div>
      ),
    },
    {
      id: 'contact',
      title: '7. Governance & Contact',
      content: (
        <div className="space-y-2">
          <p>
            For privacy inquiries, audit requests, or data protection questions, please contact our Compliance Officer:
          </p>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1.5">
            <p className="font-semibold text-slate-900">GiantPlus Ltd — GiantPay Compliance Office</p>
            <p className="text-slate-600">Golden Peacock Office Complex, Lilongwe, Malawi</p>
            <p className="text-slate-600">Email: compliance@giantpay.mw | legal@giantplus.mw</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Header */}
      <section className="relative overflow-hidden text-white pt-28 pb-14 sm:pt-36 sm:pb-16 bg-[#061428]">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/40 to-[#061428]" />
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
            <Shield className="h-4 w-4" />
            <span>Legal &amp; Regulatory Compliance</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-white">Privacy Policy</h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            How GiantPay collects, protects, and handles merchant data, customer payment transactions, and regulatory records.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Effective date: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="space-y-8">
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
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Have questions about your data?</p>
              <p className="text-xs text-slate-500">Our compliance team responds to all data requests within 48 hours.</p>
            </div>
          </div>
          <Link
            to="/company/contact"
            className="shrink-0 rounded-xl bg-[#1B4FD8] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            Contact Support
          </Link>
        </div>
      </main>
    </div>
  );
}
