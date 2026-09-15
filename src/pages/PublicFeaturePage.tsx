import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PUBLIC_NAV_GROUPS } from '@/components/navigation/publicNavData';

interface Props {
  title?: string;
  category?: string;
  description?: string;
  isPlanned?: boolean;
}

export default function PublicFeaturePage({
  title: propTitle,
  category: propCategory,
  description: propDescription,
  isPlanned: propIsPlanned,
}: Props) {
  const location = useLocation();

  // Find metadata from PUBLIC_NAV_GROUPS if not provided in props
  let title = propTitle;
  let category = propCategory;
  let description = propDescription;
  let isPlanned = propIsPlanned;

  if (!title) {
    // Special top-level routes
    if (location.pathname === '/pricing') {
      title = 'Pricing';
      category = 'Pricing';
      description =
        'Fair transaction fees with zero hidden costs. Test in sandbox today with simulated pricing models.';
      isPlanned = false;
    } else if (location.pathname === '/developers') {
      title = 'Developer Platform & Documentation';
      category = 'Developers';
      description =
        'Integrate modern Malawian payment flows into your platform using clean REST APIs, SDKs, and sandbox tooling.';
      isPlanned = false;
    } else {
      // Find matching item in PUBLIC_NAV_GROUPS
      for (const group of PUBLIC_NAV_GROUPS) {
        if (group.to === location.pathname) {
          title = group.label;
          category = 'GiantPay Platform';
          description = `Explore ${group.label} capabilities built for modern Malawian commerce.`;
          break;
        }
        const foundItem = group.items?.find((item) => item.to === location.pathname);
        if (foundItem) {
          title = foundItem.label;
          category = group.label;
          description = foundItem.description ?? `Explore ${foundItem.label} on GiantPay.`;
          isPlanned = foundItem.badge === 'Planned' || foundItem.badge === 'Coming soon';
          break;
        }
      }
    }
  }

  // Fallback defaults if still unresolved
  if (!title) {
    const slug = location.pathname.split('/').filter(Boolean).pop() ?? 'Feature';
    title = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    category = 'Platform Roadmap';
    description = 'Information and integration specifications for the GiantPay unified payments platform.';
  }

  return (
    <div>
      {/* Dark hero header banner for transparent navbar contrast */}
      <section
        className="relative overflow-hidden text-white pt-28 pb-14 sm:pt-36 sm:pb-16"
        style={{
          background: 'linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)',
        }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
            <span>{category ?? 'GiantPay Platform'}</span>
            {isPlanned && (
              <span className="rounded bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[10px] text-amber-300">
                Planned Roadmap
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base text-white/70 leading-relaxed">{description}</p>
        </div>
      </section>

      {/* Main content container */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[var(--color-navy-900)]">
            {isPlanned ? 'Planned Capability' : 'Sandbox Availability & Timeline'}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-neutral-600)] leading-relaxed">
            GiantPay is actively developing unified payment infrastructure for Malawi. In our current developer
            release, you can test payment link creation, sandbox API calls, and simulated checkout flows. All
            production integrations are planned pending formal provider and regulatory onboarding.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/register"
              className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
            >
              Create sandbox account
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-xl border border-[var(--color-neutral-300)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-navy-900)] hover:bg-[var(--color-neutral-50)] transition-colors"
            >
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
