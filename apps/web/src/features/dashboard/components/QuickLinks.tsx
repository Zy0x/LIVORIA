import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface DashboardQuickLink {
  to: string;
  icon: LucideIcon;
  label: string;
  cls: string;
}

interface QuickLinksProps {
  items: DashboardQuickLink[];
}

export function QuickLinks({ items }: QuickLinksProps) {
  return (
    <>
      <p className="section-subtitle mb-2.5">Akses Cepat</p>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {items.map(({ to, icon: Icon, label, cls }) => (
          <Link
            key={to}
            to={to}
            className={`quick-link-card flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-2xl ${cls} shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-200`}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs font-bold leading-none">{label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
