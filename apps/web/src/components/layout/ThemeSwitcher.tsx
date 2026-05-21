import { Monitor, Moon, Sun } from 'lucide-react';

import type { ThemeType } from '@/hooks/useThemePreference';

interface ThemeSwitcherProps {
  collapsed: boolean;
  isMobile: boolean;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const themeOptions: Array<{ id: ThemeType; icon: typeof Sun; label: string }> = [
  { id: 'light', icon: Sun, label: 'Terang' },
  { id: 'dark', icon: Moon, label: 'Gelap' },
  { id: 'system', icon: Monitor, label: 'Sistem' },
];

export function ThemeSwitcher({ collapsed, isMobile, theme, setTheme }: ThemeSwitcherProps) {
  return (
    <div className={`mb-4 px-2 ${collapsed && !isMobile ? 'flex flex-col items-center' : ''}`}>
      {(!collapsed || isMobile) ? (
        <>
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.12em] mb-2 sidebar-label">
            Tampilan
          </p>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            {themeOptions.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  setTheme(item.id);
                }}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg transition-all duration-200 relative z-[100]
                  ${theme === item.id
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/10'}
                `}
                title={item.label}
              >
                <item.icon className="w-3.5 h-3.5 pointer-events-none" />
                <span className="text-[10px] font-medium pointer-events-none">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            setTheme(theme === 'dark' ? 'light' : 'dark');
          }}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all relative z-[100]"
          title={`Ganti ke Mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
        >
          {theme === 'dark'
            ? <Sun className="w-4.5 h-4.5 pointer-events-none" />
            : <Moon className="w-4.5 h-4.5 pointer-events-none" />}
        </button>
      )}
    </div>
  );
}
