import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Cpu,
  Shield,
  Layers,
  Sparkles,
  Cloud,
  Truck,
  Sun,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Building2,
  CheckCircle2
} from "lucide-react";

const STATS = [
  { value: "16+", label: "Enterprise & Institutional Clients" },
  { value: "8", label: "African Countries Active" },
  { value: "6+", label: "Years Innovating Africa" },
  { value: "50+", label: "Deployed Systems & Platforms" },
];

const PRODUCTS = [
  {
    icon: Layers,
    name: "GiantPay",
    tagline: "Unified Payment Gateway & Financial Infrastructure",
    description: "The flagship digital payments platform developed by GiantPlus, enabling Malawian and African businesses to accept Airtel Money, TNM Mpamba, cards, and bank transfers via a single integration.",
    badge: "Flagship Product",
    active: true,
    to: "/company/about"
  },
  {
    icon: Cpu,
    name: "AI & Machine Learning Solutions",
    tagline: "Enterprise Intelligence & Automation",
    description: "Custom AI models, predictive analytics, natural language processing, and automated chatbots trained on enterprise data to accelerate African commerce.",
    badge: "Core Discipline",
    active: false,
    to: "https://www.giantplus-mw.com/#services"
  },
  {
    icon: Building2,
    name: "Smart ERP",
    tagline: "Enterprise Management Suite",
    description: "Comprehensive enterprise resource planning unifying accounting, payroll, procurement, asset tracking, and statutory compliance in one modern platform.",
    badge: "Enterprise Suite",
    active: false,
    to: "https://www.giantplus-mw.com/#products"
  },
  {
    icon: Truck,
    name: "Parcel Tracker",
    tagline: "Real-Time Logistics Platform",
    description: "End-to-end parcel tracking platform integrated with QR codes, GPS telematics, and automated SMS updates for courier and logistics companies.",
    badge: "Logistics",
    active: false,
    to: "https://www.giantplus-mw.com/#products"
  },
  {
    icon: Shield,
    name: "Cybersecurity & Data Protection",
    tagline: "Enterprise Threat Defense",
    description: "Security audits, penetration testing, automated threat monitoring, and cryptographic access control to secure critical national and enterprise infrastructure.",
    badge: "Security",
    active: false,
    to: "https://www.giantplus-mw.com/#services"
  },
  {
    icon: Cloud,
    name: "Cloud Hosting & ExtraSync",
    tagline: "High-Availability Infrastructure",
    description: "Reliable African and global cloud hosting, virtual private servers (VPS), automated offsite backups, and synchronized collaborative cloud storage.",
    badge: "Infrastructure",
    active: false,
    to: "https://www.giantplus-mw.com/#products"
  }
];

const CLIENTS = [
  "Ministry of Mining",
  "Ministry of Energy",
  "Ministry of Health",
  "PPDA (Public Procurement & Disposal of Assets Authority)",
  "Prime Insurance Limited",
  "The Global Fund",
  "MMRA (Malawi Medical Regulatory Authority)",
  "Kwacha Financial Services",
  "Tony Blair Institute",
  "African Union",
  "TEVETA Malawi",
  "Media Council of Malawi",
  "Tradeline Corporation",
  "Malawi Institute of Education",
  "WAG Disability Rights",
  "Emmanuel University"
];

const DIVISIONS = [
  {
    icon: Sun,
    title: "GiantPlus Clean Energy",
    description: "Powering African households and commercial facilities with residential and industrial solar installations, bulk LPG Gas distribution, battery storage, and hybrid backup power systems.",
    highlights: ["Residential & Commercial Solar", "LPG Gas Supply & Systems", "Lithium & Hybrid Battery Storage", "Electrical Engineering"]
  },
  {
    icon: GraduationCap,
    title: "Technology Trainings & Capacity",
    description: "Empowering African professionals and youth with practical skills in AI productivity, web development, cybersecurity, and business intelligence.",
    highlights: ["AI & Enterprise Productivity", "Full-Stack Web Engineering", "Cybersecurity Defense", "Data Analytics & BI"]
  }
];

export default function GiantPlusPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section
        className="relative isolate overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28 text-white"
        style={{ background: "linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(circle at 75% 35%, #1B4FD8 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>

          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Parent Company &middot; Malawi &amp; Pan-Africa
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Innovating the future{" "}
              <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-white bg-clip-text text-transparent">
                with Africa.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              GiantPlus is a pioneering Malawian software, AI, and digital transformation powerhouse. GiantPay is our unified digital payment platform, engineered to modernise commerce and financial settlement across Africa.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="https://www.giantplus-mw.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 hover:-translate-y-0.5"
              >
                Visit GiantPlus Website <ExternalLink className="h-4 w-4" />
              </a>
              <Link
                to="/company/about"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                About GiantPay Platform <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <p className="text-3xl font-extrabold text-[#1B4FD8] sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Group Mission & Story */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8]">About GiantPlus</span>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Building Africa&apos;s future with intelligence &amp; innovation.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600">
                GiantPlus is a Malawian technology company specializing in web development, AI-driven systems, cloud architecture, and digital transformation solutions. We empower government institutions, corporations, and startups with scalable, secure, and intelligent digital technologies.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Recognizing the friction businesses face in collecting digital payments from fragmented mobile money and banking networks, GiantPlus engineered <strong>GiantPay</strong> â€” providing a single, robust API and merchant portal for unified payments, webhooks, automated reconciliation, and T+1 settlements.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-slate-900">Headquarters</p>
                  <p className="text-xs text-slate-600">Lilongwe, Area 46, Malawi</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">Pan-African Operations</p>
                  <p className="text-xs text-slate-600">Malawi &middot; Rwanda &middot; Kenya &middot; Uganda</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-[#0B2445] p-8 text-white shadow-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Corporate Pillars</span>
              <h3 className="mt-2 text-2xl font-bold">The GiantPlus Standard</h3>
              <ul className="mt-6 space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Enterprise Grade Engineering:</strong> High-throughput, resilient architectures built to support national-scale operations and financial transactions.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>African Context First:</strong> Products designed specifically around local internet dynamics, mobile money dominance, and regional trade corridors.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Institutional Trust:</strong> Proven delivery record with ministries, development agencies, and financial institutions across Malawi and the AU.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions & Product Ecosystem */}
      <section className="bg-slate-50 py-20 border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8]">Ecosystem</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              The GiantPlus Technology Ecosystem
            </h2>
            <p className="mt-4 text-slate-600">
              From payment gateways to enterprise ERPs and AI platforms, explore the integrated systems powered by GiantPlus.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((prod) => {
              const Icon = prod.icon;
              return (
                <div
                  key={prod.name}
                  className={`rounded-2xl border p-7 transition flex flex-col justify-between ${
                    prod.active
                      ? "border-[#1B4FD8] bg-white shadow-md ring-2 ring-[#1B4FD8]/20"
                      : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#1B4FD8]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        prod.active ? "bg-blue-100 text-[#1B4FD8]" : "bg-slate-100 text-slate-600"
                      }`}>
                        {prod.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{prod.name}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">{prod.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{prod.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {prod.active ? (
                      <Link to={prod.to} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B4FD8] hover:underline">
                        Explore GiantPay Details <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <a
                        href={prod.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1B4FD8]"
                      >
                        View on GiantPlus.mw <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Institutional Clientele */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8]">Clientele</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Trusted by Leading Institutions
            </h2>
            <p className="mt-3 text-slate-600">
              GiantPlus proudly provides enterprise software, AI, and digital systems to governments, ministries, and corporations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {CLIENTS.map((client) => (
              <div
                key={client}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-white hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-extrabold text-[#1B4FD8]">
                  {client.charAt(0)}
                </div>
                <span className="text-xs font-semibold text-slate-800 line-clamp-2">{client}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Divisions: Energy & Training */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8]">Divisions</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Clean Energy &amp; Professional Capacity
            </h2>
            <p className="mt-3 text-slate-600">
              Beyond software, GiantPlus is driving African infrastructure development through clean energy and skills transfer.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {DIVISIONS.map((div) => {
              const Icon = div.icon;
              return (
                <div key={div.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-5">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{div.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{div.description}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {div.highlights.map((item) => (
                      <span key={item} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact & Official Links CTA */}
      <section className="py-20 bg-gradient-to-br from-[#061428] via-[#0B2445] to-[#1B4FD8] text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Partner with GiantPlus
          </h2>
          <p className="mt-4 text-base text-slate-300 max-w-2xl mx-auto">
            Ready to integrate GiantPay or consult on enterprise AI, cloud systems, and digital transformation? Our engineering and client teams in Lilongwe are ready.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-400" /> Lilongwe, Area 46, Malawi</span>
            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-blue-400" /> +265 881 933 960</span>
            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-400" /> sales@giantplus-mw.com</span>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://www.giantplus-mw.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#1B4FD8] shadow-lg transition hover:bg-blue-50"
            >
              Open Official Website (giantplus-mw.com) <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              to="/company/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              Contact GiantPay Desk <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
