import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import ScrollDirectionButton from '@/components/ScrollDirectionButton';
import { Search } from 'lucide-react';
import type { Tagihan } from '@/lib/types';
import { useHorizontalScrollPriority } from '@/hooks/useHorizontalScroll';
import { clearStack } from '@/lib/backGestureSystem';

// Page title map
const PAGE_TITLES: Record<string, { title: string; emoji: string }> = {
  '/':          { title: 'Dashboard',  emoji: '🏠' },
  '/tagihan':   { title: 'Tagihan',    emoji: '💰' },
  '/anime':     { title: 'Anime',      emoji: '📺' },
  '/donghua':   { title: 'Donghua',    emoji: '🎬' },
  '/waifu':     { title: 'Waifu',      emoji: '💕' },
  '/obat':      { title: 'Obat',       emoji: '💊' },
  '/settings':  { title: 'Pengaturan', emoji: '⚙️' },
};

export default function Layout() {
  useHorizontalScrollPriority();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => { clearStack(); }, [location.pathname]);

  const handleViewTagihan = (item: Tagihan) => {
    navigate('/tagihan', { state: { viewItem: item } });
  };

  const pageInfo = PAGE_TITLES[location.pathname] ?? { title: 'LIVORIA', emoji: '✦' };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* ── Header ── */}
        <header className="header-blur sticky top-0 z-30 border-b border-border/50">
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
            {/* Left: mobile hamburger spacer + page label */}
            <div className="flex items-center gap-3">
              <div className="lg:hidden w-9" /> {/* spacer for menu button */}
              <div className="hidden sm:flex items-center gap-2.5">
                <span
                  className="text-lg leading-none"
                  role="img"
                  aria-label={pageInfo.title}
                >
                  {pageInfo.emoji}
                </span>
                <span
                  className="text-sm font-semibold text-foreground tracking-tight"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  {pageInfo.title}
                </span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1">
              <button
                className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                title="Cari"
              >
                <Search className="w-4 h-4" />
              </button>
              <NotificationBell onViewTagihan={handleViewTagihan} />
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* ── Scroll Direction Button ── */}
      <ScrollDirectionButton />
    </div>
  );
}