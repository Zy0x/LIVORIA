import type { MutableRefObject } from 'react';
import { NavLink } from 'react-router-dom';

import { ROUTES } from '@/app/route-paths';
import type { NavigationItem } from '@/config/navigation';

interface SidebarNavProps {
  items: NavigationItem[];
  collapsed: boolean;
  isMobile: boolean;
  navRefs: MutableRefObject<(HTMLAnchorElement | null)[]>;
  onCloseMobile: () => void;
  onPrefetch: (to: string) => void;
}

export function SidebarNav({
  items,
  collapsed,
  isMobile,
  navRefs,
  onCloseMobile,
  onPrefetch,
}: SidebarNavProps) {
  return (
    <nav className={`flex-1 space-y-0.5 ${collapsed && !isMobile ? 'px-2' : 'px-2.5'}`}>
      {items.map(({ to, icon: Icon, label }, index) => (
        <NavLink
          key={to}
          to={to}
          ref={element => { navRefs.current[index] = element; }}
          onClick={() => isMobile && onCloseMobile()}
          onMouseEnter={() => onPrefetch(to)}
          end={to === ROUTES.HOME}
          className={({ isActive }) =>
            `sidebar-link group relative ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'justify-center px-0' : ''}`
          }
        >
          <Icon className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${collapsed && !isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          {(!collapsed || isMobile) && (
            <span className="sidebar-label text-sm">{label}</span>
          )}
          {collapsed && !isMobile && <CollapsedTooltip label={label} />}
        </NavLink>
      ))}
    </nav>
  );
}

export function CollapsedTooltip({ label }: { label: string }) {
  return (
    <span
      className="
        absolute left-full ml-3 px-3 py-2 rounded-xl
        bg-foreground text-background text-xs font-semibold whitespace-nowrap
        opacity-0 pointer-events-none group-hover:opacity-100
        translate-x-2 group-hover:translate-x-0
        transition-all duration-200 ease-out
        shadow-xl border border-border/20
      "
      style={{ zIndex: 999999 }}
    >
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-foreground" />
    </span>
  );
}
