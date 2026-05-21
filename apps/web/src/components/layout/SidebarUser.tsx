import { LogOut } from 'lucide-react';

interface SidebarUserProps {
  user?: { email?: string | null } | null;
  collapsed: boolean;
  isMobile: boolean;
  onSignOut: () => void | Promise<void>;
}

export function SidebarUser({ user, collapsed, isMobile, onSignOut }: SidebarUserProps) {
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const username = user?.email?.split('@')[0] ?? '';

  return (
    <div className={`
      flex items-center gap-2.5 mt-3 pt-3 border-t border-white/8
      ${collapsed && !isMobile ? 'justify-center px-0' : 'px-2'}
    `}
    >
      <div className="
        w-8 h-8 rounded-xl bg-gradient-to-br from-white/20 to-white/8
        flex items-center justify-center shrink-0
        border border-white/12 text-white font-bold text-xs
      "
      >
        {initial}
      </div>
      {(!collapsed || isMobile) && (
        <div className="flex-1 min-w-0 sidebar-label">
          <p className="text-xs font-semibold text-white/85 truncate">{username}</p>
          <p className="text-[10px] text-white/35 truncate">{user?.email}</p>
        </div>
      )}
      <button
        onClick={onSignOut}
        title="Keluar"
        className="text-white/30 hover:text-red-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-400/10"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
