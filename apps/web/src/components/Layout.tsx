import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import ScrollDirectionButton from '@/components/ScrollDirectionButton';
import { Search } from 'lucide-react';
import type { Tagihan } from '@/lib/types';
import { useHorizontalScrollPriority } from '@/hooks/useHorizontalScroll';
import { clearStack } from '@/lib/backGestureSystem';
import { isSameFeaturePaginationNavigation } from '@/shared/routing/pagination-routes';

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
  const contentRef = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => { clearStack(); }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = location.pathname;

    if (isSameFeaturePaginationNavigation(previousPathname, location.pathname)) {
      return;
    }

    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleViewTagihan = (item: Tagihan) => {
    navigate('/tagihan', { state: { viewItem: item } });
  };

  const getPageInfo = (pathname: string) => {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    // Handle paginated routes like /anime/page=1
    const base = pathname.split('/')[1];
    const baseWithSlash = `/${base}`;
    if (PAGE_TITLES[baseWithSlash]) return PAGE_TITLES[baseWithSlash];
    return { title: 'LIVORIA', emoji: '✦' };
  };

  const pageInfo = getPageInfo(location.pathname);

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
        <div ref={contentRef} className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* ── Scroll Direction Button ── */}
      <ScrollDirectionButton />
    </div>
  );
}
