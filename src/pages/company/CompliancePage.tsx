import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText, UserCheck, Lock, AlertTriangle, CheckCircle } from "lucide-react";

const FRAMEWORKS = [
  { icon: ShieldCheck, title: "Reserve Bank of Malawi (RBM)", badge: "Primary Regulator", body: "GiantPlus operates in alignment with the RBM's National Payment Systems framework. All payment processing, settlement, and reporting activities are structured to meet RBM standards for licensed payment service providers." },
  { icon: UserCheck, title: "KYC / KYB Verification", badge: "Customer Due Diligence", body: "All merchants undergo Know Your Customer (KYC) and Know Your Business (KYB) verification before production activation. Identity documents, business certificates, and ownership structures are verified against official records." },
  { icon: AlertTriangle, title: "Anti-Money Laundering (AML)", badge: "Transaction Monitoring", body: "GiantPay applies automated AML screening to transactions, monitoring for suspicious activity patterns, structuring behaviour, and sanctions list matches in real time." },
  { icon: Lock, title: "Data Protection", badge: "Privacy & Security", body: "Merchant and customer data is encrypted at rest and in transit using industry-standard protocols. We maintain strict data access controls and detailed audit logs for all system events." },
  { icon: FileText, title: "Transaction Reporting", badge: "Financial Transparency", body: "Every transaction processed through GiantPay carries a complete audit trail â€” including timestamps, provider confirmations, fee deductions, and settlement records â€” exportable for compliance reporting." },
  { icon: CheckCircle, title: "PCI DSS Alignment", badge: "Card Payment Standards", body: "Card payment processing is designed and implemented in alignment with PCI DSS (Payment Card Industry Data Security Standard) requirements, protecting cardholder data at every stage." },
];

const CERTIFICATIONS = [
  { label: "RBM Payment Framework", status: "Aligned", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { label: "KYC/KYB Onboarding", status: "Active", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { label: "AML Screening", status: "Active", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { label: "PCI DSS Alignment", status: "In Progress", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { label: "ISO 27001", status: "Planned", color: "text-slate-600 bg-slate-50 border-slate-200" },
  { label: "SOC 2 Type II", status: "Planned", color: "text-slate-600 bg-slate-50 border-slate-200" },
];

export default function CompliancePage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28"
        style={{ background: "linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 60% 50%, #1B4FD8 0%, transparent 60%)" }} />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300">
              Company &middot; Compliance
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Regulatory alignment<br />
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">at our core.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              GiantPay and GiantPlus are built compliance-first. Every product, every API, and every data handling decision is designed to meet the standards required of a regulated payment service provider in Malawi.
            </p>
          </div>
        </div>
      </section>

      {/* Status badges */}
      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-6 text-xs font-bold uppercase tracking-[.3em] text-slate-400">Compliance Status Overview</p>
          <div className="flex flex-wrap gap-3">
            {CERTIFICATIONS.map(({ label, status, color }) => (
              <div key={label} className={["inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold", color].join(" ")}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {label} &mdash; {status}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Frameworks */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Regulatory Frameworks</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How we stay compliant</h2>
            <p className="mt-4 text-slate-500">A detailed look at the regulatory frameworks, standards, and internal policies that govern GiantPay operations.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FRAMEWORKS.map(({ icon: Icon, title, badge, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                    <Icon className="h-6 w-6 text-[#1B4FD8]" />
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-[#1B4FD8]">{badge}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Merchant responsibilities */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-900">Merchant compliance obligations</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">To maintain a GiantPay merchant account, all businesses must:</p>
            <ul className="mt-6 space-y-3">
              {[
                "Complete KYC/KYB verification with valid business registration and ownership documentation",
                "Operate within approved business categories and transaction volume limits for their merchant tier",
                "Not process payments for prohibited goods or services as defined in our Acceptable Use Policy",
                "Maintain accurate and up-to-date business information in the merchant dashboard",
                "Report any suspicious transaction patterns or potential fraud to GiantPay immediately",
                "Cooperate fully with any regulatory audit or compliance review requests",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4">
              <Link to="/company/contact" className="rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1744b9]">Contact Compliance Team</Link>
              <Link to="/privacy" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
