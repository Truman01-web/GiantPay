/* eslint-disable react-refresh/only-export-components -- shared payment metadata is consumed by public feature pages. */
export interface PaymentMethodItem {
  name: string;
  badge: string;
  logo?: string;
  tone: string;
  borderTone: string;
  bgTone: string;
  description: string;
}
export const PAYMENT_METHODS: PaymentMethodItem[] = [
  {
    name: 'Airtel Money',
    badge: 'A',
    logo: '/brands/airtel-money.svg',
    tone: 'text-red-600',
    borderTone: 'border-red-200 hover:border-red-400',
    bgTone: 'bg-red-50',
    description: 'Instant mobile wallet collections & payouts across Malawi',
  },
  {
    name: 'TNM Mpamba',
    badge: 'T',
    logo: '/brands/tnm-mpamba.svg',
    tone: 'text-emerald-600',
    borderTone: 'border-emerald-200 hover:border-emerald-400',
    bgTone: 'bg-emerald-50',
    description: 'Direct wallet push & USSD payment prompts',
  },
  {
    name: 'Visa',
    badge: 'V',
    logo: '/brands/visa.svg',
    tone: 'text-blue-700',
    borderTone: 'border-blue-200 hover:border-blue-400',
    bgTone: 'bg-blue-50',
    description: 'Debit & credit card processing with 3D Secure verification',
  },
  {
    name: 'Mastercard',
    badge: 'M',
    logo: '/brands/mastercard.svg',
    tone: 'text-orange-600',
    borderTone: 'border-orange-200 hover:border-orange-400',
    bgTone: 'bg-orange-50',
    description: 'Global card acceptance with automated fraud screening',
  },
  {
    name: 'National Switch / Bank Transfer',
    badge: 'NS',
    tone: 'text-indigo-600',
    borderTone: 'border-indigo-200 hover:border-indigo-400',
    bgTone: 'bg-indigo-50',
    description: 'Interbank electronic funds transfer via National Switch',
  },
];

export function PaymentMethodsTicker() {
  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Left and Right edge gradient masks for smooth fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28 bg-gradient-to-r from-slate-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28 bg-gradient-to-l from-slate-50 to-transparent" />

      {/* Moving Track */}
      <div className="animate-marquee flex items-center gap-4 sm:gap-6">
        {/* Track 1: Primary accessible items */}
        {PAYMENT_METHODS.map((item) => (
          <div
            key={`primary-${item.name}`}
            className={`group flex items-center gap-3.5 rounded-2xl border bg-white px-5 py-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-w-[260px] sm:min-w-[290px] ${item.borderTone}`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-black text-sm transition-transform group-hover:scale-105 ${item.bgTone} ${item.borderTone}`}
            >
              {item.logo ? (
                <img
                  src={item.logo}
                  alt={`${item.name} logo`}
                  className="max-h-6 max-w-8 object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center leading-none">
                  <span className="font-extrabold tracking-tight text-indigo-700">NS</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-500">
                    SWITCH
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold tracking-tight text-slate-800 group-hover:text-[#1B4FD8] transition-colors truncate block">
                {item.name}
              </span>
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}

        {/* Track 2: Cloned track for infinite loop (aria-hidden for screen readers) */}
        {PAYMENT_METHODS.map((item, idx) => (
          <div
            key={`clone-${item.name}-${idx}`}
            aria-hidden="true"
            className={`group flex items-center gap-3.5 rounded-2xl border bg-white px-5 py-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-w-[260px] sm:min-w-[290px] ${item.borderTone}`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-black text-sm transition-transform group-hover:scale-105 ${item.bgTone} ${item.borderTone}`}
            >
              {item.logo ? (
                <img
                  src={item.logo}
                  alt=""
                  className="max-h-6 max-w-8 object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center leading-none">
                  <span className="font-extrabold tracking-tight text-indigo-700">NS</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-500">
                    SWITCH
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold tracking-tight text-slate-800 group-hover:text-[#1B4FD8] transition-colors truncate block">
                {item.name}
              </span>
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
