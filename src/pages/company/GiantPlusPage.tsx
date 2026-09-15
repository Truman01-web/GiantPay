import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Globe2, Landmark, Users, TrendingUp, Award } from "lucide-react";

const PILLARS = [
  { icon: Landmark, title: "Regulated Financial Services", body: "GiantPlus operates under the regulatory framework of the Reserve Bank of Malawi, ensuring every product we offer meets the compliance standards required of a licensed financial services entity." },
  { icon: Globe2, title: "Pan-African Vision", body: "While rooted in Malawi, GiantPlus is building toward a pan-African presence â€” enabling regional commerce and cross-border financial flows across Southern Africa." },
  { icon: Users, title: "Local Talent, Global Standards", body: "Our engineering, compliance, and product teams are built from Malawian talent trained to global fintech standards, ensuring we understand both the local context and international best practices." },
  { icon: TrendingUp, title: "Sustainable Growth Model", body: "We grow by enabling merchant growth. Our transaction-based revenue model means we only succeed when our merchants succeed â€” creating a true alignment of incentives." },
  { icon: Award, title: "Industry Recognition", body: "Recognised by the Malawi fintech community as a pioneer in unified payment infrastructure, contributing to the development of digital financial services regulation and standards." },
  { icon: Building2, title: "Institutional Partnerships", body: "GiantPlus maintains banking and provider partnerships with major Malawian institutions, enabling direct settlement, provider connectivity, and regulatory-grade transaction processing." },
];

const SUBSIDIARIES = [
  { name: "GiantPay", tagline: "Unified Payment Platform", description: "The flagship payment gateway product â€” providing merchants, platforms, and developers with a single integration for all Malawian payment channels.", to: "/company/about", active: true },
  { name: "GiantLend", tagline: "Embedded Merchant Finance", description: "Short-term merchant financing and working capital solutions built on top of transaction history and reconciled cash flow data.", to: "#", active: false },
  { name: "GiantData", tagline: "Financial Intelligence Platform", description: "Anonymised transaction analytics and financial intelligence for corporate and institutional clients in Malawi.", to: "#", active: false },
];

export default function GiantPlusPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28"
        style={{ background: "linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 70% 40%, #1B4FD8 0%, transparent 60%)" }} />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300">
              Company &middot; Parent Group
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              GiantPlus Global<br />
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">Finance Solutions.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              The parent company behind GiantPay â€” a Malawian financial services group building regulated, technology-led payment and finance infrastructure for Southern Africa.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/company/contact" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9]">
                Contact GiantPlus <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/company/about" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                About GiantPay
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Group overview */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">The Group</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">One mission. Multiple products.</h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600">GiantPlus Global Finance Solutions was established with a clear mandate: to build regulated, reliable, and accessible financial infrastructure for businesses and individuals in Malawi and across Southern Africa.</p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">Our group operates through focused product subsidiaries, each addressing a specific gap in the Malawian financial services market â€” from payment acceptance to embedded finance and financial intelligence.</p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">All GiantPlus products share a common compliance, engineering, and operational backbone â€” ensuring regulatory consistency, shared infrastructure, and unified financial controls across the group.</p>
            </div>
            <div className="space-y-5">
              {SUBSIDIARIES.map(({ name, tagline, description, to, active }) => (
                <div key={name} className={["rounded-2xl border p-6 transition", active ? "border-[#1B4FD8] bg-[#1B4FD8]/[.04] shadow-md" : "border-slate-200 bg-white hover:border-slate-300"].join(" ")}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={["text-base font-bold", active ? "text-[#1B4FD8]" : "text-slate-900"].join(" ")}>{name}</span>
                        {active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Active</span>
                          : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Planned</span>}
                      </div>
                      <p className="text-xs font-medium text-slate-500">{tagline}</p>
                    </div>
                    {active && <Link to={to} className="shrink-0 text-xs font-semibold text-[#1B4FD8] hover:underline">Learn more</Link>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Group Foundation</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Built on six pillars</h2>
            <p className="mt-4 text-slate-500">The institutional, regulatory, and operational foundation that underpins everything we build.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, body }) => (
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

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center sm:p-14">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Partner with GiantPlus</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">Whether you are a merchant, institution, or investor â€” we want to hear from you. Reach out to our team in Lilongwe or Blantyre.</p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/company/contact" className="rounded-xl bg-[#1B4FD8] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9]">Get in Touch</Link>
              <Link to="/company/compliance" className="rounded-xl border border-slate-700 bg-slate-800 px-8 py-4 text-sm font-bold text-slate-200 transition hover:bg-slate-700">View Compliance</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
