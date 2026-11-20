import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface HeroBackLinkProps {
  to?: string;
  label?: string;
  /** When true, renders the dark-variant pill (white on navy). */
  dark?: boolean;
}

/**
 * Shared "Back to Home" glass pill, duplicated verbatim across 14 sites.
 * Light variant: white/slate. Dark variant: white on navy.
 */
export function HeroBackLink({ to = '/', label = 'Back to Home', dark = false }: HeroBackLinkProps) {
  return (
    <Link
      to={to}
      className={[
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition',
        dark
          ? 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
          : 'border border-white/60 bg-white/70 text-slate-700 hover:bg-white hover:text-[#1B4FD8]',
      ].join(' ')}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}