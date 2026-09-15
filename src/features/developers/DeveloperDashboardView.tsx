import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/data-display/StatCard';
import { useApiKeysList, useWebhooksList } from './useDevelopersQueries';

export function DeveloperDashboardView() {
  const apiKeysQuery = useApiKeysList();
  const webhooksQuery = useWebhooksList();

  const activeKeysCount = apiKeysQuery.data?.items.filter((k) => k.status === 'ACTIVE').length;
  const activeKeysText = apiKeysQuery.isPending ? 'Loading...' : `${activeKeysCount ?? 0} Active`;

  const webhooksCount = webhooksQuery.data?.items.length;
  const webhooksText = webhooksQuery.isPending ? 'Loading...' : `${webhooksCount ?? 0} Registered`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy-900)]">Developer Dashboard</h1>
          <p className="text-sm text-[var(--color-neutral-600)] mt-1">
            Manage your GiantPay sandbox credentials, webhooks, and explore complete API specifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/developers/documentation">
            <Button variant="outline" size="sm">
              Documentation
            </Button>
          </Link>
          <Link to="/developers/api-keys">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Manage API Keys
            </Button>
          </Link>
        </div>
      </div>

      {/* Sandbox Status Alert */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex items-start gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 animate-pulse" />
        <div>
          <span className="font-semibold">Sandbox Environment Active:</span> You are connected to the GiantPay sandbox testing platform. Requests are routed through our simulator provider. No real funds are debited or transferred.
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sandbox API Keys"
          value={activeKeysText}
          subtitle="Scoped bearer test credentials"
        />
        <StatCard
          title="Webhook Endpoints"
          value={webhooksText}
          subtitle="Active HTTPS callbacks"
        />
        <StatCard
          title="API Health"
          value="Operational"
          subtitle="Latency < 45ms • 100% uptime"
        />
        <StatCard
          title="OpenAPI Specification"
          value="v0.1.0"
          subtitle="100% schema validation"
        />
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--color-navy-900)]">API Keys</h3>
            <p className="text-xs text-[var(--color-neutral-600)] mt-1 leading-relaxed">
              Create and manage sandbox bearer tokens with one-time secret revelation and instant revocation.
            </p>
          </div>
          <Link to="/developers/api-keys" className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View API Keys &rarr;
          </Link>
        </Card>

        <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--color-navy-900)]">Webhook Endpoints</h3>
            <p className="text-xs text-[var(--color-neutral-600)] mt-1 leading-relaxed">
              Register endpoints for payment lifecycle events, rotate signing secrets, and retry delivery failures.
            </p>
          </div>
          <Link to="/developers/webhooks" className="mt-4 text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
            Configure Webhooks &rarr;
          </Link>
        </Card>

        <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--color-navy-900)]">Developer Docs</h3>
            <p className="text-xs text-[var(--color-neutral-600)] mt-1 leading-relaxed">
              Interactive guides on authentication, HMAC webhook signing, idempotency, rate limits, and test phone numbers.
            </p>
          </div>
          <Link to="/developers/documentation" className="mt-4 text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
            Explore Documentation &rarr;
          </Link>
        </Card>
      </div>

      {/* Integration Code Preview */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--color-neutral-200)] gap-2">
          <div>
            <h3 className="font-semibold text-sm text-[var(--color-navy-900)]">Quickstart: Create Payment Link</h3>
            <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">Send a test API request to generate a checkout session</p>
          </div>
          <span className="font-mono text-xs text-blue-600 font-medium">POST /v1/payment-links</span>
        </div>

        <pre className="mt-4 rounded-xl bg-[var(--color-navy-950)] text-blue-200 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
{`curl -X POST https://api.giantpay.mw/v1/payment-links \\
  -H "Authorization: Bearer gp_test_your_secret_key" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: \${crypto.randomUUID()}" \\
  -d '{
    "name": "E-Commerce Checkout",
    "mode": "FIXED",
    "amountMinor": 2500000,
    "currency": "MWK",
    "reusable": false
  }'`}
        </pre>
      </Card>
    </div>
  );
}
