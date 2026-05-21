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
    <div className="admin-card flex gap-1 p-1 rounded-xl bg-muted/60 border border-border mb-5">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
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
