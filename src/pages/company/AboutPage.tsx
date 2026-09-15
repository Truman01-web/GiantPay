import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Target, Eye, Heart, Shield, Zap, Globe } from "lucide-react";

const HERO_BG_IMAGE = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80";
const HERO_BG_FALLBACK = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80";

const TIMELINE = [
  { year: "2021", title: "GiantPlus Founded", body: "GiantPlus Global Finance Solutions is incorporated in Malawi with a mandate to build modern financial infrastructure for Malawian businesses." },
  { year: "2022", title: "Regulatory Groundwork", body: "Deep engagement with the Reserve Bank of Malawi to understand the regulatory landscape for digital payment service providers." },
  { year: "2023", title: "GiantPay Launched", body: "GiantPay is launched as the unified payment platform product under GiantPlus, offering mobile money and bank transfer integrations." },
  { year: "2024", title: "Sandbox & Developer Platform", body: "Full sandbox environment and developer API released. Merchants can test end-to-end checkout flows, webhooks, and reconciliation before going live." },
  { year: "2025", title: "Card Payments & Growth", body: "Visa and Mastercard integration completed. GiantPay processes its first million-kwacha day and onboards its first enterprise merchants." },
];

const VALUES = [
  { icon: Target, title: "Transparency First", body: "No hidden fees, no surprises. Every transaction rate, settlement cycle, and ledger entry is visible to you in real time." },
  { icon: Shield, title: "Compliance-Led", body: "We design for regulatory alignment from day one â€” KYC/KYB, AML screening, and RBM reporting are built into every product." },
  { icon: Zap, title: "Developer Experience", body: "Clean REST APIs, predictable status models, and comprehensive sandbox tooling so your engineers can ship fast and ship confidently." },
  { icon: Heart, title: "Local-First", body: "We are a Malawian company building for Malawian commerce. Every design decision considers the local banking and mobile money reality." },
  { icon: Globe, title: "Infrastructure-Grade Reliability", body: "Payment infrastructure is critical infrastructure. We engineer for uptime, idempotency, and reconciliation correctness." },
  { icon: Eye, title: "Merchant-Centric", body: "We measure success by merchant outcomes: settled funds, zero reconciliation gaps, and growth in payment volumes processed." },
];

const STATS = [
  { value: "5+", label: "Payment channels integrated" },
  { value: "T+1", label: "Settlement to your bank" },
  { value: "1.8%", label: "Flat transaction rate from" },
  { value: "RBM", label: "Regulatory alignment" },
];

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate flex min-h-[480px] items-center overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          <img src={HERO_BG_IMAGE} onError={(e) => { e.currentTarget.src = HERO_BG_FALLBACK; }} alt=""
            className="h-full w-full object-cover object-[75%_center] opacity-45 sm:opacity-55"
            style={{ filter: "contrast(1.08) brightness(1.02)" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white" />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-[#1B4FD8]">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-[#1B4FD8] backdrop-blur-sm">
              Company &middot; Our Story
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Building Malawi&apos;s<br />
              <span className="bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400 bg-clip-text text-transparent">payment backbone.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              GiantPay is the unified digital payments platform from GiantPlus Global Finance Solutions â€” purpose-built to modernise commerce and financial access across Malawi.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <dd className="text-3xl font-extrabold text-[#1B4FD8]">{value}</dd>
                <dt className="mt-1 text-xs font-medium text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Our Mission</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Payments that work the way Malawi works.</h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600">Malawian businesses have historically juggled multiple, disconnected payment providers â€” one for mobile money, another for cards, another for bank transfers â€” with no unified view, no automated reconciliation, and no clean settlement cycle.</p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">GiantPay solves this by providing a single integration that connects Airtel Money, TNM Mpamba, Visa, Mastercard, and the National Switch through one clean API, one merchant dashboard, and one transparent fee structure.</p>
              <div className="mt-8 flex gap-4">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9]">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/company/contact" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  Contact Us
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {VALUES.slice(0, 4).map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                    <Icon className="h-5 w-5 text-[#1B4FD8]" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">What We Stand For</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Our core values</h2>
            <p className="mt-4 text-slate-500">Every product decision, engineering choice, and customer interaction is guided by these principles.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                  <Icon className="h-6 w-6 text-[#1B4FD8]" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Our Journey</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How we got here</h2>
          </div>
          <div className="relative mx-auto max-w-3xl">
            <div className="absolute left-8 top-0 h-full w-px bg-slate-200" />
            <div className="space-y-10">
              {TIMELINE.map(({ year, title, body }) => (
                <div key={year} className="relative flex gap-8">
                  <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#1B4FD8]/20 bg-[#1B4FD8]/10 text-sm font-extrabold text-[#1B4FD8]">
                    {year}
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Ready to accept payments in Malawi?</h2>
          <p className="mt-4 text-slate-500">Join merchants building on GiantPay â€” the fastest way to integrate all local payment channels through a single, reliable API.</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register" className="rounded-xl bg-[#1B4FD8] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9]">Create Free Account</Link>
            <Link to="/company/contact" className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Talk to Our Team</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
