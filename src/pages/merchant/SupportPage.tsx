import { useState } from 'react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  MessageSquarePlus,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SupportTicket {
  id: string;
  subject: string;
  category: 'Settlement' | 'API & Webhooks' | 'Refund' | 'Account Verification';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  lastReply: string;
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'CASE-2026-894',
    subject: 'Airtel Money callback delay on sandbox simulation',
    category: 'API & Webhooks',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: 'Today, 08:30',
    lastReply: 'Technical team reviewing simulation webhook logs',
  },
  {
    id: 'CASE-2026-871',
    subject: 'National Bank settlement batch confirmation for Sept 18',
    category: 'Settlement',
    priority: 'High',
    status: 'Resolved',
    createdAt: 'Sep 18, 2026',
    lastReply: 'Funds confirmed cleared by National Switch',
  },
  {
    id: 'CASE-2026-840',
    subject: 'MRA Tax clearance certificate submission for live activation',
    category: 'Account Verification',
    priority: 'Medium',
    status: 'Resolved',
    createdAt: 'Sep 12, 2026',
    lastReply: 'KYB verification approved',
  },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('Settlement');
  const [priority, setPriority] = useState<SupportTicket['priority']>('Medium');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    const newTicket: SupportTicket = {
      id: `CASE-2026-${Math.floor(100 + Math.random() * 900)}`,
      subject,
      category,
      priority,
      status: 'Open',
      createdAt: 'Just now',
      lastReply: 'Awaiting support agent review',
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setIsModalOpen(false);
      setSubject('');
      setMessage('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merchant Support &amp; Help Desk"
        description="Submit support tickets, track resolution status, and contact the GiantPay merchant care team."
        action={
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#1B4FD8] hover:bg-[#1744b9] text-white shadow-sm"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Open Support Ticket
          </Button>
        }
      />

      {/* Emergency & Direct Channels */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1B4FD8]">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Direct Phone Support</p>
              <p className="font-bold text-slate-900">+265 1 772 400</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Mon - Fri: 08:00 - 17:00 CAT (Lilongwe)</p>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Merchant Helpdesk</p>
              <p className="font-bold text-slate-900">support@giantpay.mw</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Average response time: &lt; 2 hours</p>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Emergency SLA</p>
              <p className="font-bold text-slate-900">24/7 Incident Desk</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Priority escalation for production downtime</p>
        </Card>
      </div>

      {/* Tickets List */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Your Support Cases</h3>
            <p className="text-xs text-slate-500 mt-0.5">Track inquiries submitted by your organization.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{tickets.length} total cases</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Case Reference</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Latest Update</th>
                <th className="px-6 py-3.5">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{t.subject}</p>
                    <span className="font-mono text-xs text-slate-400">{t.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">{t.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.priority === 'Urgent'
                          ? 'bg-red-50 text-red-700'
                          : t.priority === 'High'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          t.status === 'Resolved'
                            ? 'bg-emerald-600'
                            : t.status === 'In Progress'
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                        }`}
                      />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{t.lastReply}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{t.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Frequently Asked Inquiries */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-4">Quick Answers &amp; Documentation</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/developers/overview"
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100 hover:border-slate-200"
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">Developer Quickstart</p>
              <p className="text-xs text-slate-500">API keys, SDKs, and sandbox testing steps.</p>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </Link>
          <Link
            to="/status"
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100 hover:border-slate-200"
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">System Status &amp; Uptime</p>
              <p className="text-xs text-slate-500">Live operational status of Airtel, TNM, and card rails.</p>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Modal Dialog: Open Ticket */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1B4FD8]">
                <MessageSquarePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Support Ticket</h3>
                <p className="text-xs text-slate-500">Our engineering and settlement teams will review your request.</p>
              </div>
            </div>

            {success ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="mt-2 text-sm font-bold text-emerald-900">Ticket Logged Successfully!</p>
                <p className="text-xs text-emerald-700 mt-0.5">A confirmation email has been dispatched to your team.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="support-subject" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Subject</label>
                  <Input
                    id="support-subject"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of the issue..."
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="support-category" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Category</label>
                    <select
                      id="support-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Settlement">Settlement &amp; Payout</option>
                      <option value="API & Webhooks">API &amp; Webhooks</option>
                      <option value="Refund">Refund / Dispute</option>
                      <option value="Account Verification">Account Verification / KYB</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-priority" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Priority</label>
                    <select
                      id="support-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Low">Low (General Inquiry)</option>
                      <option value="Medium">Medium (Non-blocking)</option>
                      <option value="High">High (Impacting transactions)</option>
                      <option value="Urgent">Urgent (Production Critical)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="support-description" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Description &amp; Context
                  </label>
                  <textarea
                    id="support-description"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide transaction references, provider responses, or exact error messages..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#1B4FD8] hover:bg-[#1744b9] text-white"
                  >
                    Submit Ticket
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
