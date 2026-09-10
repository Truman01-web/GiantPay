import { Menu, Bell, LifeBuoy, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useSessionStore } from '@/services/auth/sessionStore';
import { useLogoutMutation } from '@/features/authentication/useAuthMutations';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const session = useSession();
  const setEnvironment = useSessionStore((s) => s.setEnvironment);
  const logout = useLogoutMutation();

  if (!session) return null;

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--color-neutral-200)] bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <IconButton label="Open menu" className="lg:hidden" onClick={onOpenMobileNav}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {session.environments.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-[var(--radius-full)] outline-none">
                <Badge variant={session.environment === 'production' ? 'success' : 'warning'}>
                  {session.environment === 'production' ? 'Production' : 'Sandbox'}
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Switch environment</DropdownMenuLabel>
              {session.environments.map((env) => (
                <DropdownMenuItem key={env} onSelect={() => setEnvironment(env)}>
                  {env === 'production' ? 'Production' : 'Sandbox'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge variant={session.environment === 'production' ? 'success' : 'warning'}>
            {session.environment === 'production' ? 'Production' : 'Sandbox'}
          </Badge>
        )}

        <IconButton label="Notifications">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </IconButton>

        <IconButton label="Help and support" asChild>
          <Link to="/support">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          </Link>
        </IconButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-[var(--radius-sm)] py-1.5 pl-1.5 pr-2 outline-none hover:bg-[var(--color-neutral-100)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-navy-100)] text-[length:var(--text-label)] font-semibold text-[var(--color-navy-800)]">
                {session.user.name.charAt(0)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[length:var(--text-label)] font-medium text-[var(--color-navy-900)]">{session.user.name}</span>
                <span className="block text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{session.user.merchantName}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-[var(--color-neutral-500)]" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <User className="h-4 w-4" aria-hidden="true" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings/security">
                <Settings className="h-4 w-4" aria-hidden="true" /> Security settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
