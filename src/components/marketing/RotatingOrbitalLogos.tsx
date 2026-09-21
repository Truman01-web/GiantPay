import { useState } from 'react';
import { Zap, Smartphone, CreditCard, CheckCircle2 } from 'lucide-react';

export interface RotatingOrbitalLogosProps {
  type: 'mobile-money' | 'card-payments';
  className?: string;
}

export function RotatingOrbitalLogos({ type, className = '' }: RotatingOrbitalLogosProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isMobileMoney = type === 'mobile-money';

  const brandA = isMobileMoney
    ? {
        name: 'Airtel Money',
        subtext: 'Express Push',
        logo: '/brands/airtel-money.svg',
        accentColor: '#E60000',
        glowColor: 'rgba(230, 0, 0, 0.25)',
        badgeBg: 'bg-red-500/10 border-red-500/30 text-red-300',
        tag: 'Prompt USSD',
      }
    : {
        name: 'Visa',
        subtext: 'Debit & Credit',
        logo: '/brands/visa.svg',
        accentColor: '#1A1F71',
        glowColor: 'rgba(26, 31, 113, 0.35)',
        badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
        tag: '3D Secure 2.0',
      };

  const brandB = isMobileMoney
    ? {
        name: 'TNM Mpamba',
        subtext: 'Instant Debit',
        logo: '/brands/tnm-mpamba.svg',
        accentColor: '#008751',
        glowColor: 'rgba(0, 135, 81, 0.25)',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        tag: 'Real-Time Debit',
      }
    : {
        name: 'Mastercard',
        subtext: 'Global Clearing',
        logo: '/brands/mastercard.svg',
        accentColor: '#EB001B',
        glowColor: 'rgba(235, 0, 27, 0.35)',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        tag: 'Tokenized Vault',
      };

  const centerTitle = isMobileMoney ? 'GiantPay Mobile Rails' : 'GiantPay Card Processing';
  const centerSubtitle = isMobileMoney ? 'Dual Carrier Settlement' : 'PCI-DSS Tier 1 Ready';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer ambient radiant glow */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-full opacity-40 blur-3xl transition-opacity duration-700"
        style={{
          background: isMobileMoney
            ? 'radial-gradient(circle, rgba(230,0,0,0.2) 0%, rgba(0,135,81,0.2) 60%, transparent 80%)'
            : 'radial-gradient(circle, rgba(26,31,113,0.3) 0%, rgba(235,0,27,0.25) 60%, transparent 80%)',
        }}
      />

      {/* Orbit Track Arena */}
      <div className="relative h-[310px] w-[310px] sm:h-[350px] sm:w-[350px] flex items-center justify-center">
        {/* Orbital Track Rings */}
        <div className="absolute inset-2 rounded-full border border-dashed border-white/20 animate-pulse-subtle" />
        <div className="absolute inset-8 rounded-full border border-white/10" />
        <div className="absolute inset-16 rounded-full border border-dashed border-white/15" />

        {/* Central GiantPay Core Hub */}
        <div className="relative z-10 flex flex-col items-center justify-center rounded-3xl border border-white/20 bg-[#071731]/85 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-blue-400/50 max-w-[170px] text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-2 shadow-lg shadow-blue-500/30">
            <img
              src="/giantpay-mark.png"
              alt="GiantPay"
              className="h-full w-full object-contain filter drop-shadow"
            />
            {/* Pulsing ring behind center logo */}
            <div className="absolute -inset-1 rounded-2xl border border-blue-400/40 animate-ping opacity-30 pointer-events-none" />
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
            {isMobileMoney ? <Smartphone className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
            <span>Active Rail</span>
          </div>

          <p className="mt-1 text-xs font-extrabold text-white leading-tight">{centerTitle}</p>
          <p className="mt-0.5 text-[10px] text-slate-400 font-medium">{centerSubtitle}</p>
        </div>

        {/* Continuous Orbital Rotation System */}
        <div
          className="absolute inset-0 animate-orbit-cw pointer-events-none"
          style={{
            animationPlayState: isHovered ? 'running' : 'running',
            animationDuration: '14s',
          }}
        >
          {/* Logo A (Top Position / 0 deg) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <div
              className="animate-orbit-counter"
              style={{
                animationDuration: '14s',
              }}
            >
              <div
                className="group relative flex flex-col items-center rounded-2xl border border-white/25 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/50 cursor-pointer"
                style={{
                  boxShadow: `0 10px 25px -5px ${brandA.glowColor}`,
                }}
              >
                <div className="flex h-12 w-20 items-center justify-center rounded-xl bg-white p-1.5 shadow-md">
                  <img
                    src={brandA.logo}
                    alt={brandA.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="mt-1.5 text-center">
                  <p className="text-xs font-bold text-white leading-none">{brandA.name}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold border ${brandA.badgeBg}`}>
                    {brandA.tag}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Logo B (Bottom Position / 180 deg) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-auto">
            <div
              className="animate-orbit-counter"
              style={{
                animationDuration: '14s',
              }}
            >
              <div
                className="group relative flex flex-col items-center rounded-2xl border border-white/25 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/50 cursor-pointer"
                style={{
                  boxShadow: `0 10px 25px -5px ${brandB.glowColor}`,
                }}
              >
                <div className="flex h-12 w-20 items-center justify-center rounded-xl bg-white p-1.5 shadow-md">
                  <img
                    src={brandB.logo}
                    alt={brandB.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="mt-1.5 text-center">
                  <p className="text-xs font-bold text-white leading-none">{brandB.name}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold border ${brandB.badgeBg}`}>
                    {brandB.tag}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Telemetry Badges */}
        <div className="absolute -left-4 top-6 hidden sm:flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md shadow-lg">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>99.8% Channel Uptime</span>
        </div>

        <div className="absolute -right-4 bottom-6 hidden sm:flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md shadow-lg">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Instant Push Confirmation</span>
        </div>
      </div>
    </div>
  );
}
