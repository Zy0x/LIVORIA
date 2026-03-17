import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import { Search } from 'lucide-react';
import type { Tagihan } from '@/lib/types';
import { useHorizontalScrollPriority } from '@/hooks/useHorizontalScroll';
import { clearBackGestureStack } from '@/hooks/useBackGesture';

export default function Layout() {
  useHorizontalScrollPriority();
  const navigate = useNavigate();
  const location = useLocation();

  // Bersihkan stack back-gesture setiap kali pathname berubah
  // Ini memastikan modal dari halaman sebelumnya tidak mengganggu halaman baru
  useEffect(() => {
    clearBackGestureStack();
  }, [location.pathname]);

  const handleViewTagihan = (item: Tagihan) => {
    navigate('/tagihan', { state: { viewItem: item } });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="lg:hidden w-10" />
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-accent transition-colors">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <NotificationBell onViewTagihan={handleViewTagihan} />
          </div>
        </header>
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}