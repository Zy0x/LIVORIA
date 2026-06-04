import { Database, HardDrive, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { AdminTab } from '../admin-page-helpers';

const tabs: Array<{ id: AdminTab; label: string; icon: LucideIcon }> = [
  { id: 'database', label: 'Database', icon: Database },
  { id: 'backup', label: 'Backup', icon: HardDrive },
  { id: 'users', label: 'Pengguna', icon: Users },
];

interface AdminTabsProps {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
}

export function AdminTabs({ activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="admin-card mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/60 p-1 shadow-sm">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-bold transition-all sm:px-3 ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        );
      })}
    </div>
  );
}
