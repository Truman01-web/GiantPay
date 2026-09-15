import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Clock, MessageSquare, Building2, HeadphonesIcon } from "lucide-react";

const OFFICES = [
  {
    city: "Lilongwe",
    role: "Head Office",
    address: "Area 46, Lilongwe, Malawi",
    phone: "+265 881 933 960",
    email: "info@giantpay.mw",
    hours: "Mon – Fri, 08:00 – 17:00 CAT",
  },
  {
    city: "Blantyre",
    role: "Commercial Office",
    address: "Ginnery Corner, Blantyre, Malawi",
    phone: "+265 885 362 150",
    email: "support@giantpay.mw",
    hours: "Mon â€“ Fri, 08:00 â€“ 17:00 CAT",
  },
];

const CHANNELS = [
  { icon: HeadphonesIcon, title: "Merchant Support", description: "For active merchants needing transaction, settlement, or reconciliation help.", contact: "support@giantpay.mw" },
  { icon: Building2, title: "Sales & Enterprise", description: "Volume pricing, enterprise integrations, and custom payment solutions.", contact: "sales@giantpay.mw" },
  { icon: MessageSquare, title: "Developer Relations", description: "API questions, sandbox issues, and technical integration assistance.", contact: "developers@giantpay.mw" },
  { icon: Mail, title: "Compliance & Legal", description: "Regulatory inquiries, AML/KYC matters, and data requests.", contact: "compliance@giantpay.mw" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "general", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28"
        style={{ background: "linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 60% 40%, #1B4FD8 0%, transparent 60%)" }} />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300">
              Company &middot; Contact
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Talk to our<br />
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">Malawi team.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              We have offices in Lilongwe and Blantyre. Our merchant support, sales, developer relations, and compliance teams are available Monday through Friday.
            </p>
          </div>
        </div>
      </section>

      {/* Contact channels */}
      <section className="border-y border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map(({ icon: Icon, title, description, contact }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                  <Icon className="h-5 w-5 text-[#1B4FD8]" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
                <a href={"mailto:" + contact} className="mt-3 block text-xs font-semibold text-[#1B4FD8] hover:underline">{contact}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content: form + offices */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2">
            {/* Contact form */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Send a Message</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Get in touch</h2>
              <p className="mt-4 text-slate-500">Fill out the form and a member of our team will respond within one business day.</p>

              {submitted ? (
                <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <Mail className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-emerald-900">Message sent!</h3>
                  <p className="mt-2 text-sm text-emerald-700">Thank you for reaching out. We will get back to you within one business day.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-sm font-semibold text-emerald-700 hover:underline">Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="contact-name">Full Name *</label>
                      <input id="contact-name" type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Banda"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="contact-email">Email Address *</label>
                      <input id="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@business.mw"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/20" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="contact-company">Company / Business Name</label>
                    <input id="contact-company" type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                      placeholder="My Business Ltd."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="contact-subject">Subject</label>
                    <select id="contact-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/20">
                      <option value="general">General Inquiry</option>
                      <option value="merchant">Merchant Support</option>
                      <option value="sales">Sales & Enterprise</option>
                      <option value="developer">Developer / API</option>
                      <option value="compliance">Compliance / Legal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="contact-message">Message *</label>
                    <textarea id="contact-message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us how we can help..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/20 resize-none" />
                  </div>
                  <button type="submit"
                    className="w-full rounded-xl bg-[#1B4FD8] py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9] active:scale-[0.99]">
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Offices */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Our Offices</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Find us in Malawi</h2>
              <p className="mt-4 text-slate-500">Visit our offices or reach out via phone and email during business hours.</p>
              <div className="mt-8 space-y-6">
                {OFFICES.map(({ city, role, address, phone, email, hours }) => (
                  <div key={city} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                        <MapPin className="h-5 w-5 text-[#1B4FD8]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{city}</h3>
                        <p className="text-xs text-slate-500">{role}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />{address}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                        <a href={"tel:" + phone.replace(/\s/g, "")} className="hover:text-[#1B4FD8]">{phone}</a>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <a href={"mailto:" + email} className="hover:text-[#1B4FD8]">{email}</a>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Clock className="h-4 w-4 shrink-0 text-slate-400" />{hours}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* WhatsApp CTA */}
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-sm font-bold text-emerald-900">Prefer WhatsApp?</h3>
                <p className="mt-1 text-xs text-emerald-700">Chat directly with our merchant support team on WhatsApp for faster responses.</p>
                <a href="https://wa.me/265885362150" target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700">
                  Open WhatsApp Chat
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
