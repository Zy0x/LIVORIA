import { BarChart3, Calculator, CreditCard, FileText } from 'lucide-react';

import type { SubPage } from '../types/tagihan.types';

const TABS: { key: SubPage; label: string; icon: typeof FileText }[] = [
  { key: 'tagihan', label: 'Daftar', icon: CreditCard },
  { key: 'laporan', label: 'Laporan', icon: BarChart3 },
  { key: 'kalkulator', label: 'Kalkulator', icon: Calculator },
];

interface TagihanTabsProps {
  active: SubPage;
  onChange: (value: SubPage) => void;
}

export default function TagihanTabs({ active, onChange }: TagihanTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

