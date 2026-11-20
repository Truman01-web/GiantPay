import type { ReactNode } from 'react';

export interface GradientTextProps {
  children: ReactNode;
  /**
   * `light` = blue→sky gradient for use on white backgrounds.
   * `dark` = blue-300→sky-200→white for use on navy backgrounds.
   */
  variant?: 'light' | 'dark';
  /** Optional className appended after the gradient classes. */
  className?: string;
}

/**
 * Shared gradient-text span, inlined by hand across every public page's H1.
 * Light variant: `from-[#1B4FD8] via-blue-500 to-sky-400`.
 * Dark variant: `from-blue-400 via-sky-300 to-cyan-300`.
 */
export function GradientText({ children, variant = 'light', className = '' }: GradientTextProps) {
  const gradient =
    variant === 'dark'
      ? 'bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300'
      : 'bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400';
  return (
    <span className={[gradient, 'bg-clip-text text-transparent', className].join(' ')}>
      {children}
    </span>
  );
}