import { Link } from "react-router-dom";
import { ArrowRight, Target, Eye, Heart, Shield, Zap, Globe } from "lucide-react";
import { PublicPageHero } from "@/components/marketing/PublicPageHero";

const HERO_BG_IMAGE = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80";
const HERO_BG_FALLBACK = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80";

const TIMELINE = [
  { year: "2021", title: "GiantPlus Founded", body: "GiantPlus Global Finance Solutions is incorporated in Malawi with a mandate to build modern financial infrastructure for Malawian businesses." },
  { year: "2022", title: "Regulatory Groundwork", body: "Deep engagement with the Reserve Bank of Malawi to understand the regulatory landscape for digital payment service providers." },
  { year: "2023", title: "GiantPay Launched", body: "GiantPay is launched as the unified payment platform product under GiantPlus, targeting mobile money and bank transfer integration across Malawi." },
  { year: "2024", title: "Sandbox & Developer Platform", body: "Full sandbox environment and developer API released. Merchants can test end-to-end checkout flows, webhooks, payment links, and reconciliation before going live." },
  { year: "2025", title: "Merchant Onboarding & Compliance", body: "Merchant onboarding, KYC/KYB workflows, and the reconciliation platform are live in sandbox. Provider integration agreements with Airtel, TNM, and card networks are in progress — live payment execution pending regulatory and commercial approvals." },
];

const VALUES = [
  { icon: Target, title: "Transparency First", body: "No hidden fees, no surprises. Every transaction rate, settlement cycle, and ledger entry is visible to you in real time." },
  { icon: Shield, title: "Compliance-Led", body: "We design for regulatory alignment from day one — KYC/KYB, AML screening, and RBM reporting are built into every product." },
  { icon: Zap, title: "Developer Experience", body: "Clean REST APIs, predictable status models, and comprehensive sandbox tooling so your engineers can ship fast and ship confidently." },
  { icon: Heart, title: "Local-First", body: "We are a Malawian company building for Malawian commerce. Every design decision considers the local banking and mobile money reality." },
  { icon: Globe, title: "Infrastructure-Grade Reliability", body: "Payment infrastructure is critical infrastructure. We engineer for uptime, idempotency, and reconciliation correctness." },
  { icon: Eye, title: "Merchant-Centric", body: "We measure success by merchant outcomes: settled funds, zero reconciliation gaps, and growth in payment volumes processed." },
];

const STATS = [
  { value: "5", label: "Payment channels in sandbox" },
  { value: "T+1", label: "Target settlement cycle (sandbox)" },
  { value: "2–3%", label: "Confirmed transaction rate range" },
  { value: "RBM", label: "Regulatory alignment in progress" },
];

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <PublicPageHero
        badge="Company · Our Story"
        title={<>Building Malawi&apos;s</>}
        titleAccent="payment backbone."
        description="GiantPay is the unified digital payments platform from GiantPlus Global Finance Solutions — purpose-built to modernise commerce and financial access across Malawi."
        heroBgUrl={HERO_BG_IMAGE}
        heroBgFallback={HERO_BG_FALLBACK}
      />

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
              <p className="mt-6 text-base leading-relaxed text-slate-600">Malawian businesses have historically juggled multiple, disconnected payment providers — one for mobile money, another for cards, another for bank transfers — with no unified view, no automated reconciliation, and no clean settlement cycle.</p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">GiantPay is building the infrastructure to connect Airtel Money, TNM Mpamba, Visa, Mastercard, and the National Switch through one clean API, one merchant dashboard, and one transparent fee structure. The sandbox is fully operational; live payment channels are being activated through provider and regulatory approvals.</p>
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
