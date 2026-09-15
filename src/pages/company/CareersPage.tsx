import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Sparkles,
  Heart,
  Laptop,
  GraduationCap,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle2,
  Mail,
  Users
} from "lucide-react";

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  status: "Open" | "Upcoming";
}

const JOBS: JobOpening[] = [
  {
    id: "eng-fullstack",
    title: "Senior Full-Stack Engineer (TypeScript / Node)",
    department: "Engineering",
    location: "Blantyre / Remote (Malawi)",
    type: "Full-Time",
    description: "Build robust ledger systems, payment gateway connectors, and developer-facing APIs powering thousands of daily transactions across Malawi.",
    requirements: [
      "4+ years building production applications with Node.js and TypeScript",
      "Experience with PostgreSQL, distributed transactions, and idempotency patterns",
      "Deep understanding of RESTful API design and webhook architectures",
      "Passion for payment infrastructure and high-reliability systems"
    ],
    status: "Open"
  },
  {
    id: "eng-devops",
    title: "DevOps & Cloud Security Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-Time",
    description: "Own our AWS/GCP infrastructure, CI/CD pipelines, Kubernetes clusters, and PCI-DSS compliance automation.",
    requirements: [
      "Experience with Terraform, Docker, and Kubernetes in high-compliance environments",
      "Familiarity with security scanning, secrets management, and SOC 2/PCI-DSS controls",
      "Hands-on telemetry and observability setup (Prometheus, Grafana, OpenTelemetry)"
    ],
    status: "Open"
  },
  {
    id: "prod-compliance",
    title: "Merchant Compliance & Onboarding Specialist",
    department: "Operations",
    location: "Lilongwe / Blantyre",
    type: "Full-Time",
    description: "Guide new enterprises and SMEs through KYB/KYC verification, RBM compliance checks, and transaction monitoring policies.",
    requirements: [
      "2+ years experience in Malawian financial services, banking, or fintech compliance",
      "Familiarity with Reserve Bank of Malawi payment regulations and AML/CFT standards",
      "Strong communication and merchant relationship skills"
    ],
    status: "Open"
  },
  {
    id: "biz-growth",
    title: "Enterprise Account Executive",
    department: "Growth",
    location: "Blantyre / Lilongwe",
    type: "Full-Time",
    description: "Partner with Malawian retailers, utility providers, educational institutions, and e-commerce platforms to adopt GiantPay payment solutions.",
    requirements: [
      "Proven B2B sales or account management track record in Malawi",
      "Strong network within local retail, corporate, or financial institutions",
      "Deep understanding of merchant payment pain points and payment flows"
    ],
    status: "Upcoming"
  }
];

const PERKS = [
  {
    icon: Laptop,
    title: "Modern Tech Stack & Hardware",
    description: "MacBook or top-spec Linux workstation, ergonomic budget, and the tools you need to do your best work without friction."
  },
  {
    icon: TrendingUp,
    title: "Competitive Pay & Equity",
    description: "Market-leading salaries benchmarked against regional fintech leaders, with performance bonuses and equity incentives."
  },
  {
    icon: Clock,
    title: "Flexible & Hybrid Work",
    description: "We focus on outcomes, not hours logged. Enjoy flexible hybrid working between our Blantyre hub and your home office."
  },
  {
    icon: GraduationCap,
    title: "Learning & Growth Stipend",
    description: "Annual budget for courses, books, tech conferences, and certifications in cloud architecture, security, and finance."
  },
  {
    icon: Heart,
    title: "Comprehensive Health Support",
    description: "Generous medical coverage for you and your direct dependents, with wellness days and mental health support."
  },
  {
    icon: Sparkles,
    title: "Massive Local Impact",
    description: "Your code and decisions directly impact how millions of Kwacha move every single day across Malawi's economy."
  }
];

export default function CareersPage() {
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [activeJob, setActiveJob] = useState<JobOpening | null>(null);

  const departments = ["All", "Engineering", "Operations", "Growth"];

  const filteredJobs = selectedDept === "All"
    ? JOBS
    : JOBS.filter((j) => j.department === selectedDept);

  return (
    <main className="overflow-hidden bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#061428] via-[#0B2445] to-[#0d2d5e] pt-24 pb-20 text-white lg:pt-32 lg:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(27,79,216,0.35),transparent)] pointer-events-none" />
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-sm">
              <Users className="h-3.5 w-3.5" /> Company &middot; Careers & Culture
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Build Malawi&apos;s financial infrastructure{" "}
              <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-white bg-clip-text text-transparent">
                with us.
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              At GiantPay, we are solving one of the most foundational challenges in modern African commerce: making digital payments seamless, instant, and trusted for every merchant and citizen.
            </p>
          </div>
        </div>
      </section>

      {/* Culture & Values */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8]">Why GiantPay</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Life at GiantPay
            </h2>
            <p className="mt-4 text-slate-600">
              We hold a high standard for execution while creating an environment where ambitious builders do the best work of their lives.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#1B4FD8]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{perk.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {perk.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-white py-20 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8]">Opportunities</span>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Open Positions
              </h2>
              <p className="mt-2 text-slate-600">
                Explore current job openings across our engineering, product, and growth teams.
              </p>
            </div>

            {/* Department Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedDept === dept
                      ? "bg-[#1B4FD8] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 transition hover:border-blue-300 hover:bg-white hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-[#1B4FD8]">
                        {job.department}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {job.type}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-slate-900">{job.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 max-w-3xl">{job.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => setActiveJob(activeJob?.id === job.id ? null : job)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      {activeJob?.id === job.id ? "Hide Details" : "View & Apply"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {activeJob?.id === job.id && (
                  <div className="mt-6 pt-6 border-t border-slate-200 animate-fadeIn">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Requirements & Qualifications</h4>
                    <ul className="mt-3 space-y-2">
                      {job.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap items-center gap-4">
                      <a
                        href={`mailto:careers@giantpay.mw?subject=Application:%20${encodeURIComponent(job.title)}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <Mail className="h-4 w-4" /> Submit Application via Email
                      </a>
                      <span className="text-xs text-slate-500">
                        Attach CV, portfolio/GitHub, and a short intro note.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Talent Network Callout */}
      <section className="py-20 bg-gradient-to-r from-[#061428] via-[#0B2445] to-[#1B4FD8] text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-blue-300 mb-6 backdrop-blur-sm">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Don&apos;t see your specific role?
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            We are always scouting for high-conviction software engineers, payment specialists, security researchers, and customer champions. Let&apos;s talk.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:careers@giantpay.mw?subject=General%20Application%20-%20Talent%20Network"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-base font-bold text-[#1B4FD8] shadow-lg transition hover:bg-blue-50"
            >
              <Mail className="h-5 w-5" /> Send General CV to careers@giantpay.mw
            </a>
            <Link
              to="/company/about"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3 text-base font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              Learn About Our Mission <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
