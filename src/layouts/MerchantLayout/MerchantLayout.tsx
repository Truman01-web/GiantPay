import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '@/components/navigation/Logo';
import { IconButton } from '@/components/ui/IconButton';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { readPersisted, writePersisted } from '@/lib/persist';
import { MERCHANT_NAV } from '@/app/router/navigation';
import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';

export function MerchantLayout() {
  const [collapsed, setCollapsed] = useState(() => readPersisted('giantpay.ui.sidebarCollapsed', false));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      writePersisted('giantpay.ui.sidebarCollapsed', !prev);
      return !prev;
    });
  }

  return (
    <TooltipProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="flex min-h-screen bg-[var(--color-neutral-50)]">
        <aside
          className="hidden shrink-0 flex-col bg-[var(--color-navy-950)] transition-[width] duration-[var(--duration-base)] lg:flex"
          style={{ width: collapsed ? '4.5rem' : '15.5rem' }}
        >
          <div className="flex h-16 items-center justify-between px-4">
            {!collapsed && <Logo inverted />}
            {collapsed && <Logo variant="mark" />}
          </div>
          <SidebarNav groups={MERCHANT_NAV} collapsed={collapsed} />
          <div className="border-t border-white/10 p-2">
            <IconButton
              label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleCollapsed}
              className="w-full text-[var(--color-neutral-100)] hover:bg-white/10"
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
            </IconButton>
          </div>
        </aside>

        <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DrawerContent title="Menu">
            <div className="bg-[var(--color-navy-950)] pb-4">
              <SidebarNav groups={MERCHANT_NAV} collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <ErrorBoundary boundaryName="this page">
              <Suspense fallback={<FullPageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
