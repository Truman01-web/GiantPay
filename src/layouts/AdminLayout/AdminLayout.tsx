import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { Logo } from '@/components/navigation/Logo';
import { IconButton } from '@/components/ui/IconButton';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Badge } from '@/components/ui/Badge';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { ADMIN_NAV } from '@/app/router/navigation';
import { SidebarNav } from '@/layouts/MerchantLayout/SidebarNav';
import { useSession } from '@/hooks/useSession';
import { useLogoutMutation } from '@/features/authentication/useAuthMutations';

export function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const session = useSession();
  const logout = useLogoutMutation();

  return (
    <TooltipProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="flex min-h-screen bg-[var(--color-neutral-50)]">
        <aside className="hidden w-60 shrink-0 flex-col bg-[var(--color-navy-950)] lg:flex">
          <div className="flex h-16 items-center gap-2 px-4">
            <Logo inverted />
            <Badge variant="navy">Admin</Badge>
          </div>
          <SidebarNav groups={ADMIN_NAV} collapsed={false} />
        </aside>

        <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DrawerContent title="Admin menu">
            <div className="bg-[var(--color-navy-950)] pb-4">
              <SidebarNav groups={ADMIN_NAV} collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--color-neutral-200)] bg-white px-4 sm:px-6">
            <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </IconButton>
            <div className="flex items-center gap-3">
              {session && <span className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">{session.user.name}</span>}
              <IconButton label="Sign out" onClick={() => logout.mutate()}>
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </div>
          </header>
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
