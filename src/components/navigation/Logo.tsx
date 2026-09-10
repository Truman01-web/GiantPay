import { LOGO_SRC } from '@/assets/brand';
import { cn } from '@/lib/cn';

export function Logo({
  variant = 'full',
  inverted,
  className,
}: {
  variant?: 'full' | 'mark';
  /** Use on dark surfaces (e.g. the navy sidebar) so the wordmark stays legible. */
  inverted?: boolean;
  className?: string;
}) {
  // The supplied asset is a single full lockup (icon + "GiantPay" +
  // tagline) rendered on its own light backing — there's no standalone
  // icon-only crop to use for the collapsed-sidebar "mark" slot without
  // cropping the source file, which isn't allowed. That slot keeps the
  // typographic placeholder until a proper icon-only/favicon asset exists.
  if (LOGO_SRC && variant === 'full') {
    const img = (
      <img
        src={LOGO_SRC}
        alt="GiantPay"
        className={cn('h-10 w-auto object-contain', !inverted && className)}
      />
    );

    if (!inverted) return img;

    // The source image has an opaque light background, which would be a
    // "visually conflicting background" directly on the dark navy sidebar
    // (spec explicitly disallows that) — give it a light backing plate
    // instead of altering the asset itself.
    return (
      <span className={cn('inline-flex items-center rounded-[var(--radius-sm)] bg-white px-2 py-1', className)}>
        {img}
      </span>
    );
  }

  // Swappable typographic placeholder — see src/assets/brand/index.ts.
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)} aria-label="GiantPay">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-600)] text-[15px] font-bold text-white">
        G
      </span>
      {variant === 'full' && (
        <span className={cn('text-[length:var(--text-h4)]', inverted ? 'text-white' : 'text-[var(--color-navy-950)]')}>
          Giant<span className="text-[var(--color-blue-400)]">Pay</span>
        </span>
      )}
    </span>
  );
}
