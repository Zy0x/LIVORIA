import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Settings, Shield, X } from 'lucide-react';

import { QUERY_KEYS } from '@/app/query-keys';
import { ROUTES } from '@/app/route-paths';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { CollapsedTooltip, SidebarNav } from '@/components/layout/SidebarNav';
import { SidebarUser } from '@/components/layout/SidebarUser';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import {
  DASHBOARD_PREFETCH_KEYS,
  NAV_ITEMS,
  NAV_PREFETCH_MAP,
} from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useThemePreference } from '@/hooks/useThemePreference';
import { isMobile } from '@/lib/motion';

type Gsap = typeof import('gsap').default;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useThemePreference();
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLElement>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const isAnimating = useRef(false);
  const gsapRef = useRef<Gsap | null>(null);

  const loadGsap = useCallback(async () => {
    gsapRef.current ??= (await import('gsap')).default;
    return gsapRef.current;
  }, []);

  const handlePrefetch = useCallback((to: string) => {
    const config = NAV_PREFETCH_MAP[to];
    if (config) {
      queryClient.prefetchQuery({ queryKey: config.queryKey, queryFn: config.fn, staleTime: 5 * 60 * 1000 });
    }

    if (to === ROUTES.HOME) {
      for (const queryKey of DASHBOARD_PREFETCH_KEYS) {
        const dashboardConfig = Object.values(NAV_PREFETCH_MAP).find(item => item.queryKey === queryKey);
        if (dashboardConfig) {
          queryClient.prefetchQuery({ queryKey, queryFn: dashboardConfig.fn, staleTime: 5 * 60 * 1000 });
        }
      }
    }
  }, [queryClient]);

  useEffect(() => {
    if (!sidebarRef.current) return;
    if (isMobile()) return;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    void loadGsap().then((gsap) => {
      if (cancelled || !sidebarRef.current) return;
      ctx = gsap.context(() => {
      gsap.fromTo(
        sidebarRef.current!,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: 'power2.out', delay: 0.1 },
      );
      const links = sidebarRef.current!.querySelectorAll('.sidebar-link');
      if (links.length > 0) {
        gsap.fromTo(
          links,
          { x: -12, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.03, duration: 0.25, ease: 'power2.out', delay: 0.2 },
        );
      }
      }, sidebarRef);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [loadGsap]);

  useEffect(() => {
    if (isMobile()) return;
    const refs = navRefs.current.filter(Boolean);
    if (refs.length === 0) return;
    void loadGsap().then((gsap) => refs.forEach(element => {
      if (!element) return;
      const isActive = element.classList.contains('active');
      gsap.to(element, {
        x: isActive ? 0 : 0,
        scale: isActive ? 1.02 : 1,
        duration: 0.25,
        ease: 'power2.out',
      });
    }));
  }, [loadGsap, location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    if (isMobile()) {
      if (overlayRef.current) overlayRef.current.style.opacity = '1';
      if (mobileRef.current) {
        mobileRef.current.style.opacity = '1';
        mobileRef.current.style.transform = 'translateX(0%)';
      }
      return;
    }

    let cancelled = false;
    void loadGsap().then((gsap) => {
      if (cancelled) return;
    if (overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
    }
    if (mobileRef.current) {
      gsap.fromTo(
        mobileRef.current,
        { x: '-100%', opacity: 0.9 },
        { x: '0%', opacity: 1, duration: 0.3, ease: 'power2.out' },
      );
      const links = mobileRef.current.querySelectorAll('.sidebar-link');
      if (links.length > 0) {
        gsap.fromTo(
          links,
          { x: -12, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.02, duration: 0.2, ease: 'power2.out', delay: 0.1 },
        );
      }
    }
    });

    return () => {
      cancelled = true;
    };
  }, [loadGsap, mobileOpen]);

  const closeMobile = useCallback(() => {
    if (isAnimating.current) return;
    if (isMobile()) {
      setMobileOpen(false);
      return;
    }
    isAnimating.current = true;
    void loadGsap().then((gsap) => {
      const timeline = gsap.timeline({
      onComplete: () => {
        setMobileOpen(false);
        isAnimating.current = false;
      },
      });
      if (mobileRef.current) {
        timeline.to(mobileRef.current, { x: '-100%', opacity: 0.5, duration: 0.3, ease: 'power3.in' }, 0);
      }
      if (overlayRef.current) {
        timeline.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0.05);
      }
    }).catch(() => {
      setMobileOpen(false);
      isAnimating.current = false;
    });
  }, [loadGsap]);

  const handleCollapse = useCallback(() => {
    if (!sidebarRef.current || isAnimating.current) return;
    isAnimating.current = true;
    const newCollapsed = !collapsed;
    const labels = sidebarRef.current.querySelectorAll('.sidebar-label');
    const links = sidebarRef.current.querySelectorAll('.sidebar-link');

    void loadGsap().then((gsap) => {
      const timeline = gsap.timeline({
      onComplete: () => {
        setCollapsed(newCollapsed);
        isAnimating.current = false;
      },
      });

    if (!newCollapsed) {
      timeline.to(sidebarRef.current, { width: 240, duration: 0.35, ease: 'power3.inOut' }, 0);
      if (labels.length > 0) {
        timeline.fromTo(
          labels,
          { opacity: 0, x: -12, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, stagger: 0.025, duration: 0.25, ease: 'back.out(1.5)' },
          0.15,
        );
      }
      if (links.length > 0) {
        timeline.fromTo(
          links,
          { x: -4 },
          { x: 0, stagger: 0.02, duration: 0.2, ease: 'power2.out' },
          0.1,
        );
      }
    } else {
      if (labels.length > 0) {
        timeline.to(labels, { opacity: 0, x: -8, scale: 0.9, stagger: 0.015, duration: 0.15, ease: 'power2.in' }, 0);
      }
      timeline.to(sidebarRef.current, { width: 68, duration: 0.35, ease: 'power3.inOut' }, 0.08);
    }
    }).catch(() => {
      setCollapsed(newCollapsed);
      isAnimating.current = false;
    });
  }, [collapsed, loadGsap]);

  const openMobile = useCallback(() => {
    if (mobileOpen) return;
    setMobileOpen(true);
  }, [mobileOpen]);

  const sidebarContent = (isMobile = false) => (
    <>
      <div className={`flex items-center gap-3 px-4 py-5 mb-1 ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shrink-0 border border-white/10">
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="overflow-hidden sidebar-label flex-1">
            <h2
              className="font-bold text-sm text-white leading-tight tracking-wide"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", letterSpacing: '0.04em' }}
            >
              LIVORIA
            </h2>
            <p className="text-[10px] text-white/40 truncate">Personal Archive</p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={closeMobile}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {(!collapsed || isMobile) && (
        <p className="px-4 text-[9px] font-bold text-white/30 uppercase tracking-[0.12em] mb-2 sidebar-label">
          Menu
        </p>
      )}

      <SidebarNav
        items={NAV_ITEMS}
        collapsed={collapsed}
        isMobile={isMobile}
        navRefs={navRefs}
        onCloseMobile={closeMobile}
        onPrefetch={handlePrefetch}
      />

      <div className={`pb-4 mt-auto space-y-0.5 ${collapsed && !isMobile ? 'px-2' : 'px-2.5'}`}>
        <ThemeSwitcher
          collapsed={collapsed}
          isMobile={isMobile}
          theme={theme}
          setTheme={setTheme}
        />

        {(!collapsed || isMobile) && (
          <p className="px-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.12em] mb-2 sidebar-label">
            Lainnya
          </p>
        )}
        <NavLink
          to={ROUTES.SETTINGS}
          onClick={() => isMobile && closeMobile()}
          className={({ isActive }) =>
            `sidebar-link group relative ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'justify-center px-0' : ''}`
          }
        >
          <Settings className={`shrink-0 transition-transform duration-200 group-hover:rotate-45 ${collapsed && !isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          {(!collapsed || isMobile) && <span className="sidebar-label text-sm">Pengaturan</span>}
          {collapsed && !isMobile && <CollapsedTooltip label="Pengaturan" />}
        </NavLink>

        <SidebarUser
          user={user}
          collapsed={collapsed}
          isMobile={isMobile}
          onSignOut={signOut}
        />
      </div>
    </>
  );

  return (
    <>
      <MobileSidebar
        mobileOpen={mobileOpen}
        overlayRef={overlayRef}
        mobileRef={mobileRef}
        onOpen={openMobile}
        onClose={closeMobile}
      >
        {sidebarContent(true)}
      </MobileSidebar>

      <aside
        ref={sidebarRef}
        className={`hidden lg:flex flex-col h-screen sticky top-0 z-40 border-r border-white/5 transition-none ${collapsed ? 'w-[68px]' : 'w-60'}`}
        style={{ background: 'hsl(var(--sidebar-bg))' }}
      >
        <button
          onClick={handleCollapse}
          className="
            absolute -right-3.5 top-8 w-7 h-7 rounded-full
            bg-card border border-border shadow-md
            flex items-center justify-center z-50
            hover:bg-accent hover:shadow-lg
            transition-all duration-200 active:scale-90
          "
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        {sidebarContent()}
      </aside>
    </>
  );
}
