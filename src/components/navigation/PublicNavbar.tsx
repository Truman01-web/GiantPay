import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/navigation/Logo';
import { PUBLIC_NAV_GROUPS, type NavGroup } from './publicNavData';
import { cn } from '@/lib/cn';

export function PublicNavbar() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMobileGroups, setExpandedMobileGroups] = useState<Record<string, boolean>>({});

  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Passive, efficient scroll listener (threshold: 8px)
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 8;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close desktop dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Escape key to close active dropdown or mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeGroup) {
          const currentTrigger = triggerRefs.current[activeGroup];
          setActiveGroup(null);
          currentTrigger?.focus();
        }
        if (mobileOpen) {
          setMobileOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGroup, mobileOpen]);

  // Body scroll lock when mobile navigation is open
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  const toggleGroup = useCallback((label: string) => {
    setActiveGroup((prev) => (prev === label ? null : label));
  }, []);

  const toggleMobileGroup = (label: string) => {
    setExpandedMobileGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <header
      ref={navRef}
      role="banner"
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-200 ease-standard motion-reduce:transition-none',
        'border-b border-white/40 bg-white/50 backdrop-blur-md',
        isScrolled || mobileOpen ? 'shadow-sm shadow-slate-900/5' : 'shadow-none'
      )}
    >
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-blue-400"
            aria-label="GiantPay Home"
          >
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1"
          >
            {PUBLIC_NAV_GROUPS.map((group: NavGroup) => {
              if (group.to && !group.items) {
                const isActive = location.pathname === group.to;
                return (
                  <Link
                    key={group.label}
                    to={group.to}
                    className={cn(
                      'px-3.5 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-400',
                      isActive
                        ? 'bg-[#1B4FD8]/10 text-[#1B4FD8]'
                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {group.label}
                  </Link>
                );
              }

              const isOpen = activeGroup === group.label;
              const hasActiveChild = group.items?.some((item) => location.pathname === item.to);

              return (
                <div
                  key={group.label}
                  className="relative"
                  onMouseLeave={() => setActiveGroup((current) => (current === group.label ? null : current))}
                >
                  <button
                    ref={(el) => {
                      triggerRefs.current[group.label] = el;
                    }}
                    type="button"
                    id={`nav-btn-${group.label}`}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    aria-controls={`nav-menu-${group.label}`}
                    onClick={() => toggleGroup(group.label)}
                    onMouseEnter={() => setActiveGroup(group.label)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-400',
                      isOpen || hasActiveChild
                        ? 'bg-[#1B4FD8]/10 text-[#1B4FD8]'
                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
                    )}
                  >
                    <span>{group.label}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={cn(
                        'h-4 w-4 transition-transform duration-200 motion-reduce:transition-none text-slate-400',
                        isOpen ? 'rotate-180 text-[#1B4FD8]' : ''
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Desktop Dropdown Panel */}
                  {isOpen && (
                    <div
                      id={`nav-menu-${group.label}`}
                      role="menu"
                      aria-labelledby={`nav-btn-${group.label}`}
                      className="absolute left-0 mt-1.5 w-80 rounded-2xl border border-white/70 bg-white/80 p-2.5 shadow-2xl shadow-slate-900/10 backdrop-blur-3xl animate-in fade-in-50 zoom-in-95 duration-150 motion-reduce:animate-none"
                    >
                      <div className="mb-1 border-b border-slate-200/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {group.label}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {group.items?.map((item) => {
                          const isCurrent = location.pathname === item.to;
                          return (
                            <Link
                              key={item.label}
                              to={item.to}
                              role="menuitem"
                              className={cn(
                                'group flex flex-col rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-400',
                                isCurrent
                                  ? 'bg-[#1B4FD8]/10 text-[#1B4FD8]'
                                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
                              )}
                              aria-current={isCurrent ? 'page' : undefined}
                              onClick={() => setActiveGroup(null)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-800 group-hover:text-[#1B4FD8] transition-colors">
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span className="rounded-md bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                  {item.description}
                                </p>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Sign In & Get Started */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 transition-all focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] shadow-sm focus-visible:outline-2 focus-visible:outline-blue-400"
            style={{
              background: 'linear-gradient(135deg, #1a6dcc 0%, #0d4694 100%)',
              boxShadow: '0 2px 10px rgba(26,109,204,0.3)',
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            to="/register"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200/80 bg-white/50 text-slate-700 hover:bg-white hover:text-slate-950 transition-colors focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="fixed inset-x-0 top-16 sm:top-20 bottom-0 z-40 bg-[#061428]/95 backdrop-blur-2xl border-t border-white/10 overflow-y-auto px-4 py-6 sm:px-6 flex flex-col justify-between"
        >
          <div className="flex flex-col gap-3">
            {PUBLIC_NAV_GROUPS.map((group) => {
              if (group.to && !group.items) {
                const isActive = location.pathname === group.to;
                return (
                  <Link
                    key={group.label}
                    to={group.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex min-h-[44px] items-center rounded-xl px-4 text-base font-semibold transition-colors',
                      isActive ? 'bg-blue-600/20 text-white' : 'text-white/85 hover:bg-white/5 hover:text-white'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {group.label}
                  </Link>
                );
              }

              const isExpanded = Boolean(expandedMobileGroups[group.label]);

              return (
                <div key={group.label} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMobileGroup(group.label)}
                    aria-expanded={isExpanded}
                    className="flex min-h-[44px] w-full items-center justify-between px-4 text-left text-base font-semibold text-white"
                  >
                    <span>{group.label}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={cn(
                        'h-5 w-5 transition-transform duration-200 text-white/60',
                        isExpanded ? 'rotate-180 text-white' : ''
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/10 bg-black/20 p-2 flex flex-col gap-1">
                      {group.items?.map((item) => {
                        const isCurrent = location.pathname === item.to;
                        return (
                          <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex min-h-[44px] flex-col justify-center rounded-lg px-3 py-1.5 transition-colors',
                              isCurrent ? 'bg-blue-600/30 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                            )}
                            aria-current={isCurrent ? 'page' : undefined}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.label}</span>
                              {item.badge && (
                                <span className="rounded bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-white/50 line-clamp-1">{item.description}</p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Bottom Actions */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-center text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center justify-center rounded-xl px-4 text-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
