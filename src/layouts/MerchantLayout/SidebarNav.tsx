import { NavLink } from 'react-router-dom';
import { hasPermission } from '@/types/auth';
import { useSession } from '@/hooks/useSession';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import type { NavGroup } from '@/app/router/navigation';

export function SidebarNav({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  const session = useSession();

  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-4">
      {groups.map((group) => {
        const visibleItems = group.items.filter((item) => !item.permission || hasPermission(session, item.permission));
        if (visibleItems.length === 0) return null;
        return (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[length:var(--text-help)] font-semibold uppercase tracking-wide text-[var(--color-neutral-500)]">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {visibleItems.map((item) => {
                const link = (
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[length:var(--text-body)] font-medium',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-[var(--color-blue-50)] text-[var(--color-blue-600)]'
                          : 'text-[var(--color-neutral-100)] hover:bg-white/10',
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
                return <li key={item.to}>{collapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link}</li>;
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
