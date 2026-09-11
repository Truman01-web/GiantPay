import { MARK_SRC, LOGO_SRC } from '@/assets/brand';
import { cn } from '@/lib/cn';

/**
 * GiantPay logo component.
 *
 * variant="full"   → GP mark icon  +  "GiantPay" wordmark side-by-side.
 *                    Clean in any navbar / header.
 *
 * variant="mark"   → Standalone GP icon only. Used in the collapsed sidebar,
 *                    watermark backgrounds, and tight/compact slots.
 *
 * variant="lockup" → Full-size official PNG lockup (mark + wordmark + tagline).
 *                    Only for large hero / splash contexts.
 *
 * The `inverted` prop is kept for call-site compatibility but is a no-op
 * because all PNGs now have a transparent background.
 */
export function Logo({
  variant = 'full',
  inverted,
  className,
}: {
  variant?: 'full' | 'mark' | 'lockup';
  inverted?: boolean;
  className?: string;
}) {
  /* ── When inverted on dark background, render LogoWhite ── */
  if (inverted && variant === 'full') {
    return <LogoWhite className={className} />;
  }

  /* ── Standalone icon only ── */
  if (variant === 'mark') {
    return (
      <img
        src={MARK_SRC}
        alt=""
        aria-hidden="true"
        className={cn('h-10 w-auto object-contain', className)}
      />
    );
  }

  /* ── Full official PNG lockup (hero / card) ── */
  if (variant === 'lockup') {
    return (
      <img
        src={LOGO_SRC}
        alt="GiantPay"
        className={cn('h-20 w-auto object-contain', className)}
      />
    );
  }

  /* ── Default: GP mark icon + "GiantPay" wordmark in a row ── */
  return (
    <span
      className={cn('inline-flex items-center gap-3', className)}
      aria-label="GiantPay"
    >
      {/* GP mark icon — square crop of the PNG */}
      <img
        src={MARK_SRC}
        alt=""
        aria-hidden="true"
        className="h-10 w-10 object-contain flex-shrink-0"
      />
      {/* Wordmark */}
      <span className="flex flex-col leading-none">
        <span
          className="text-[19px] sm:text-[20px] font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #1a6dcc 0%, #0d3e8a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Giant
          <span
            style={{
              background: 'linear-gradient(135deg, #c01c28 0%, #8b0000 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Pay
          </span>
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400 mt-0.5">
          Global Finance
        </span>
      </span>
    </span>
  );
}

/**
 * White-on-dark version of the inline logo (for dark navbars / sidebars).
 * Uses the same mark icon + pure-white wordmark.
 */
export function LogoWhite({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-3', className)}
      aria-label="GiantPay"
    >
      <img
        src={MARK_SRC}
        alt=""
        aria-hidden="true"
        className="h-10 w-10 object-contain flex-shrink-0"
      />
      <span className="flex flex-col leading-none">
        <span className="text-[19px] sm:text-[20px] font-bold tracking-tight text-white">
          Giant<span className="text-[#c9a227]">Pay</span>
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45 mt-0.5">
          Global Finance
        </span>
      </span>
    </span>
  );
}
