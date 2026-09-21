import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface BackButtonProps {
  to?: string;
  fallbackTo?: string;
  label?: string;
  variant?: 'glass' | 'dark' | 'light';
  className?: string;
}

export function BackButton({
  to,
  fallbackTo = '/',
  label = 'Back',
  variant = 'glass',
  className = '',
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    // If no explicit `to` was provided and there is navigation history, go back
    if (!to && typeof window !== 'undefined' && window.history.length > 1) {
      e.preventDefault();
      navigate(-1);
    }
  };

  const variantClasses = {
    glass:
      'border-white/20 bg-white/10 text-white shadow-sm backdrop-blur-md hover:bg-white/20 hover:border-white/30',
    dark:
      'border-slate-200 bg-white/80 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white hover:text-[#1B4FD8] hover:border-blue-200',
    light:
      'border-white/60 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white hover:text-[#1B4FD8]',
  }[variant];

  return (
    <Link
      to={to || fallbackTo}
      onClick={handleClick}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${variantClasses} ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </Link>
  );
}
