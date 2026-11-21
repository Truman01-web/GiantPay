import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/navigation/Logo';
import { PUBLIC_NAV_GROUPS, type NavGroup } from './publicNavData';
import { cn } from '@/lib/cn';

// Matches the mobile menu's close transition below — keep in sync.
const MOBILE_MENU_TRANSITION_MS = 200;

export function PublicNavbar() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [expandedMobileGroups, setExpandedMobileGroups] = useState<Record<string, boolean>>({});

  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeMenus = useCallback(() => {
    setActiveGroup(null);
    setMobileOpen(false);
    if (mobileMenuTimeoutRef.current) clearTimeout(mobileMenuTimeoutRef.current);
    mobileMenuTimeoutRef.current = setTimeout(() => {
      setMobileMenuMounted(false);
      mobileMenuTimeoutRef.current = null;
    }, MOBILE_MENU_TRANSITION_MS);
  }, []);

  const openMobileMenu = useCallback(() => {
    if (mobileMenuTimeoutRef.current) clearTimeout(mobileMenuTimeoutRef.current);
    mobileMenuTimeoutRef.current = null;
    setMobileMenuMounted(true);
    setMobileOpen(true);
  }, []);

  useEffect(() => () => {
    if (mobileMenuTimeoutRef.current) clearTimeout(mobileMenuTimeoutRef.current);
  }, []);

  // Close menus for browser back/forward navigation. Link clicks close them
  // directly in their onClick handlers below.
  useEffect(() => {
    window.addEventListener('popstate', closeMenus);
    return () => window.removeEventListener('popstate', closeMenus);
  }, [closeMenus]);

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

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (navRef.current && !navRef.current.contains(event.target as Node)) {
      closeMenus();
    }
  }, [closeMenus]);

  // Click/tap outside to close the desktop dropdown or the mobile panel
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Handle Escape key to close active dropdown or mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeGroup) {
          const currentTrigger = triggerRefs.current[activeGroup];
          closeMenus();
          currentTrigger?.focus();
        }
        if (mobileOpen) {
          closeMenus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGroup, closeMenus, mobileOpen]);

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
        'fixed top-0 inset-x-0 z-[1000] transition-all duration-300 ease-in-out motion-reduce:transition-none',
        isScrolled || mobileOpen
          ? 'border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-900/5'
          : 'border-b border-transparent bg-transparent shadow-none backdrop-blur-none'
      )}
    >
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            onClick={closeMenus}
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
                    onClick={closeMenus}
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
                <div key={group.label} className="relative">
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
                      className="absolute left-0 mt-1.5 w-80 rounded-2xl border border-white/70 bg-white/95 p-2.5 shadow-2xl shadow-slate-900/10 backdrop-blur-3xl animate-in fade-in-50 zoom-in-95 duration-150 motion-reduce:animate-none"
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
                              onClick={closeMenus}
                            >
                              <span className="text-sm font-semibold text-slate-800 group-hover:text-[#1B4FD8] transition-colors">
                                {item.label}
                              </span>
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
            onClick={closeMenus}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 transition-all focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            onClick={closeMenus}
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
            onClick={closeMenus}
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => (mobileOpen ? closeMenus() : openMobileMenu())}
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
      {mobileMenuMounted && (
        <div
          role="dialog"
          aria-modal="true"
          aria-hidden={!mobileOpen}
          inert={!mobileOpen}
          aria-label="Mobile Navigation Menu"
          className={cn(
            'fixed inset-x-0 top-[var(--header-height)] z-[1001] bg-[#061428]/95 backdrop-blur-2xl border-t border-white/10',
            'max-h-[calc(100dvh-var(--header-height))] overflow-y-auto overscroll-contain',
            'px-4 pt-6 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
            'flex flex-col justify-between',
            'transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none',
          )}
        >
          <div className="flex flex-col gap-3">
            {PUBLIC_NAV_GROUPS.map((group) => {
              if (group.to && !group.items) {
                const isActive = location.pathname === group.to;
                return (
                  <Link
                    key={group.label}
                    to={group.to}
                    onClick={closeMenus}
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
                            onClick={closeMenus}
                            className={cn(
                              'flex min-h-[44px] flex-col justify-center rounded-lg px-3 py-1.5 transition-colors',
                              isCurrent ? 'bg-blue-600/30 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                            )}
                            aria-current={isCurrent ? 'page' : undefined}
                          >
                            <span className="text-sm font-medium">{item.label}</span>
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
              onClick={closeMenus}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-center text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={closeMenus}
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
