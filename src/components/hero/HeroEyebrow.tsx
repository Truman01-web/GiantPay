import type { ReactNode } from 'react';

export interface HeroEyebrowProps {
  children: ReactNode;
}

/**
 * Shared eyebrow chip above the H1, matching the Company pages' style:
 * rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300.
 */
export function HeroEyebrow({ children }: HeroEyebrowProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300 backdrop-blur-sm">
      {children}
    </div>
  );
}