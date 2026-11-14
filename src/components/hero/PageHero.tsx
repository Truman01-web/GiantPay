import type { ReactNode } from 'react';
import { HeroBackLink } from './HeroBackLink';
import { HeroEyebrow } from './HeroEyebrow';
import { GradientText } from './GradientText';

export type HeroVariant = 'light' | 'dark';

export interface PageHeroProps {
  /** Page title; gradient words should be wrapped in <GradientText> by the consumer. */
  children: ReactNode;
  /** Short description below the title. */
  description?: ReactNode;
  /** Eyebrow chip above the title (e.g. "Company · About"). */
  eyebrow?: ReactNode;
  /** Optional in-hero CTA row. */
  actions?: ReactNode;
  /** Background image URL. When omitted, uses the variant's base colour only. */
  image?: string;
  /** Image fit + opacity tuning. */
  imageClassName?: string;
  /** Back-to-home pill; pass `false` to suppress (LandingPage has none). */
  backLink?: boolean | { to: string; label?: string };
  /** Hero variant — drives base colour, text colour, and back-link tone. */
  variant?: HeroVariant;
  /** When true, use a single flat scrim over the image (Privacy/Terms/Status style). */
  flatScrim?: boolean;
  /** Additional className on the section element. */
  className?: string;
  /** Optional padding override (defaults to the shared `pt-24 pb-20 lg:pt-32 lg:pb-28`). */
  padding?: string;
  /** Container max-width class. */
  containerClassName?: string;
  /** Extra decorative layers (blobs, grid-bg, glow). */
  decorative?: boolean;
}

const DEFAULT_LIGHT_IMAGE =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80';

/**
 * Shared public-page hero. Carries the Company pages' visual identity:
 * back-link pill → eyebrow chip → gradient-text H1 → description → optional CTAs,
 * on either a light photo-wash or dark navy base.
 *
 * Every public page should render its hero through this component rather than
 * inlining the markup, so the identity stays consistent as pages are added.
 */
export function PageHero({
  children,
  description,
  eyebrow,
  actions,
  image,
  imageClassName,
  backLink = true,
  variant = 'light',
  flatScrim = false,
  className = '',
  padding = 'pt-24 pb-20 lg:pt-32 lg:pb-28',
  containerClassName = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
  decorative = false,
}: PageHeroProps) {
  const isDark = variant === 'dark';
  const baseStyle = isDark
    ? { background: 'linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)' }
    : undefined;

  const backLinkProps = backLink === true ? {} : backLink;

  const imageScrim = isDark
    ? ['bg-gradient-to-r from-[#061428] via-[#061428]/90 to-[#0B2445]/80', 'bg-gradient-to-b from-[#061428]/80 via-transparent to-[#061428]']
    : ['bg-gradient-to-r from-white/95 via-white/80 to-white/40', 'bg-gradient-to-b from-white/50 via-transparent to-white'];

  return (
    <section
      className={['relative isolate overflow-hidden', padding, className].join(' ')}
      style={baseStyle}
    >
      {image && (
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src={image}
            alt=""
            className={['h-full w-full', imageClassName ?? 'object-cover object-center'].join(' ')}
          />
          <div className={['absolute inset-0', flatScrim ? 'bg-[#061428]/85' : imageScrim[0]].join(' ')} />
          {!flatScrim && <div className={['absolute inset-0', imageScrim[1]].join(' ')} />}
        </div>
      )}
      {decorative && (
        <div aria-hidden className="grid-bg absolute inset-0 opacity-60 pointer-events-none" />
      )}
      <div className={['relative', containerClassName].join(' ')}>
        {backLink !== false && (
          <div className="mb-8">
            <HeroBackLink to={backLinkProps.to} label={backLinkProps.label} dark={isDark} />
          </div>
        )}
        <div className="max-w-3xl">
          {eyebrow && <div className="mb-5"><HeroEyebrow>{eyebrow}</HeroEyebrow></div>}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {children}
          </h1>
          {description && (
            <p className={['mt-6 max-w-2xl text-lg leading-relaxed', isDark ? 'text-white/70' : 'text-slate-600'].join(' ')}>
              {description}
            </p>
          )}
          {actions && <div className="mt-8 flex flex-wrap gap-4">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

export { GradientText, HeroBackLink, HeroEyebrow };