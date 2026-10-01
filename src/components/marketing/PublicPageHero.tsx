import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface PublicPageHeroProps {
  /** Short label shown in the small badge above the heading, e.g. "Company · Our Story" */
  badge?: string;
  /** Main page heading */
  title: ReactNode;
  /** Portion of the heading rendered in the brand-blue gradient */
  titleAccent?: ReactNode;
  /** Supporting paragraph beneath the heading */
  description?: ReactNode;
  /** Hero background image URL (Unsplash or local) */
  heroBgUrl?: string;
  /** Fallback src if heroBgUrl fails to load */
  heroBgFallback?: string;
  /** Optional CTA row below the description */
  actions?: ReactNode;
  /** "Back to X" back-navigation link. Defaults to "Back to Home" → "/" */
  backTo?: string;
  backLabel?: string;
  /** Left-aligned (default) or centred */
  align?: 'left' | 'center';
}

/**
 * Reusable public-page hero matching the AboutPage reference design.
 *
 * Design rules (from docs/design-system.md):
 * - Uses only CSS token values — no arbitrary hex in JSX
 * - Photo opacity 45–55%, white gradient from left, bottom fade
 * - Proportions: min-h-[480px], pt-24/pb-20 (lg: pt-32/pb-28)
 * - Content max-width: max-w-7xl (outer) + max-w-3xl (copy)
 * - No glass effects, no large decorative animations
 * - Back-navigation pill with ArrowLeft
 * - Badge pill → h1 → supporting text → optional actions
 */
export function PublicPageHero({
  badge,
  title,
  titleAccent,
  description,
  heroBgUrl,
  heroBgFallback,
  actions,
  backTo = '/',
  backLabel = 'Back to Home',
  align = 'left',
}: PublicPageHeroProps) {
  const isCenter = align === 'center';

  return (
    <section
      className={`relative isolate flex min-h-[480px] items-center overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28`}
    >
      {/* Background image layer */}
      {heroBgUrl && (
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          <img
            src={heroBgUrl}
            onError={(e) => {
              if (heroBgFallback) e.currentTarget.src = heroBgFallback;
            }}
            alt=""
            className="h-full w-full object-cover object-[75%_center] opacity-45 sm:opacity-55"
            style={{ filter: 'contrast(1.08) brightness(1.02)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white" />
        </div>
      )}

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-8">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--color-navy-700)] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[var(--color-blue-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-600)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        </div>

        {/* Copy block */}
        <div className={`max-w-3xl${isCenter ? ' mx-auto text-center' : ''}`}>
          {badge && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-blue-100)] bg-[var(--color-blue-50)]/80 px-4 py-1.5 text-xs font-bold text-[var(--color-blue-600)] backdrop-blur-sm">
              {badge}
            </div>
          )}

          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-navy-950)] sm:text-5xl lg:text-6xl">
            {title}
            {titleAccent && (
              <>
                <br />
                <span className="bg-gradient-to-r from-[var(--color-blue-600)] via-[var(--color-blue-500)] to-sky-400 bg-clip-text text-transparent">
                  {titleAccent}
                </span>
              </>
            )}
          </h1>

          {description && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-navy-700)]">
              {description}
            </p>
          )}

          {actions && (
            <div
              className={`mt-8 flex flex-wrap gap-4${isCenter ? ' justify-center' : ''}`}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
