import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Receipt, Tv, Film, Heart, Pill,
  Settings, LogOut, ChevronLeft, Menu, Shield, X
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tagihan', icon: Receipt,         label: 'Tagihan' },
  { to: '/anime',   icon: Tv,              label: 'Anime' },
  { to: '/donghua', icon: Film,            label: 'Donghua' },
  { to: '/waifu',   icon: Heart,           label: 'Waifu' },
  { to: '/obat',    icon: Pill,            label: 'Obat' },
];

export default function Sidebar() {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const { user, signOut } = useAuth();
  const location    = useLocation();
  const sidebarRef  = useRef<HTMLElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);
  const mobileRef   = useRef<HTMLElement>(null);
  const navRefs     = useRef<(HTMLAnchorElement | null)[]>([]);
  const isAnimating = useRef(false);

  /* Desktop entry — smooth slide + fade */
  useEffect(() => {
    if (!sidebarRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(sidebarRef.current!,
        { x: -30, opacity: 0, scale: 0.98 },
        { x: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', delay: 0.15 }
      );
      const links = sidebarRef.current!.querySelectorAll('.sidebar-link');
      if (links.length > 0) {
        gsap.fromTo(links,
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.05, duration: 0.35, ease: 'power2.out', delay: 0.3 }
        );
      }
    }, sidebarRef);
    return () => ctx.revert();
  }, []);

  /* Nav highlight animation on route change */
  useEffect(() => {
    const refs = navRefs.current.filter(Boolean);
    if (refs.length === 0) return;
    refs.forEach((el) => {
      if (!el) return;
      const isActive = el.classList.contains('active');
      gsap.to(el, {
        x: isActive ? 0 : 0,
        scale: isActive ? 1.02 : 1,
        duration: 0.25,
        ease: 'power2.out',
      });
    });
  }, [location.pathname]);

  /* Mobile open animation */
  useEffect(() => {
    if (!mobileOpen) return;
    if (overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    }
    if (mobileRef.current) {
      gsap.fromTo(mobileRef.current,
        { x: '-100%', opacity: 0.8 },
        { x: '0%', opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      const links = mobileRef.current.querySelectorAll('.sidebar-link');
      if (links.length > 0) {
        gsap.fromTo(links,
          { x: -24, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.04, duration: 0.3, ease: 'back.out(1.2)', delay: 0.15 }
        );
      }
      const labels = mobileRef.current.querySelectorAll('.sidebar-label');
      if (labels.length > 0) {
        gsap.fromTo(labels,
          { opacity: 0, y: 4 },
          { opacity: 1, y: 0, stagger: 0.02, duration: 0.25, ease: 'power2.out', delay: 0.2 }
        );
      }
    }
  }, [mobileOpen]);

  const closeMobile = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    const tl = gsap.timeline({
      onComplete: () => { setMobileOpen(false); isAnimating.current = false; },
    });
    if (mobileRef.current) {
      tl.to(mobileRef.current, { x: '-100%', opacity: 0.5, duration: 0.3, ease: 'power3.in' }, 0);
    }
    if (overlayRef.current) {
      tl.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0.05);
    }
  }, []);

  const handleCollapse = useCallback(() => {
    if (!sidebarRef.current || isAnimating.current) return;
    isAnimating.current = true;
    const newCollapsed = !collapsed;
    const labels = sidebarRef.current.querySelectorAll('.sidebar-label');
    const links = sidebarRef.current.querySelectorAll('.sidebar-link');

    const tl = gsap.timeline({
      onComplete: () => { setCollapsed(newCollapsed); isAnimating.current = false; },
    });

    if (!newCollapsed) {
      // Expanding
      tl.to(sidebarRef.current, { width: 240, duration: 0.35, ease: 'power3.inOut' }, 0);
      if (labels.length > 0) {
        tl.fromTo(labels,
          { opacity: 0, x: -12, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, stagger: 0.025, duration: 0.25, ease: 'back.out(1.5)' },
          0.15
        );
      }
      if (links.length > 0) {
        tl.fromTo(links,
          { x: -4 },
          { x: 0, stagger: 0.02, duration: 0.2, ease: 'power2.out' },
          0.1
        );
      }
    } else {
      // Collapsing
      if (labels.length > 0) {
        tl.to(labels, { opacity: 0, x: -8, scale: 0.9, stagger: 0.015, duration: 0.15, ease: 'power2.in' }, 0);
      }
      tl.to(sidebarRef.current, { width: 68, duration: 0.35, ease: 'power3.inOut' }, 0.08);
    }
  }, [collapsed]);

  /* ── Avatar initial ── */
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const username = user?.email?.split('@')[0] ?? '';

  const sidebarContent = (isMobile = false) => (
    <>
      {/* Brand */}
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

      {/* Section label */}
      {(!collapsed || isMobile) && (
        <p className="px-4 text-[9px] font-bold text-white/30 uppercase tracking-[0.12em] mb-2 sidebar-label">
          Menu
        </p>
      )}

      {/* Nav */}
      <nav className={`flex-1 space-y-0.5 ${collapsed && !isMobile ? 'px-2' : 'px-2.5'}`}>
        {navItems.map(({ to, icon: Icon, label }, i) => (
          <NavLink
            key={to}
            to={to}
            ref={el => { navRefs.current[i] = el; }}
            onClick={() => isMobile && closeMobile()}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link group relative ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'justify-center px-0' : ''}`
            }
          >
            <Icon className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${collapsed && !isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
            {(!collapsed || isMobile) && (
              <span className="sidebar-label text-sm">{label}</span>
            )}
            {/* Collapsed tooltip — rendered via portal-like high z-index */}
            {collapsed && !isMobile && (
              <span
                className="
                  absolute left-full ml-3 px-3 py-2 rounded-xl
                  bg-foreground text-background text-xs font-semibold whitespace-nowrap
                  opacity-0 pointer-events-none group-hover:opacity-100
                  translate-x-2 group-hover:translate-x-0
                  transition-all duration-200 ease-out
                  shadow-xl border border-border/20
                "
                style={{ zIndex: 999999 }}
              >
                {label}
                <span className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-foreground" />
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className={`pb-4 mt-auto space-y-0.5 ${collapsed && !isMobile ? 'px-2' : 'px-2.5'}`}>
        {(!collapsed || isMobile) && (
          <p className="px-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.12em] mb-2 sidebar-label">
            Lainnya
          </p>
        )}
        <NavLink
          to="/settings"
          onClick={() => isMobile && closeMobile()}
          className={({ isActive }) =>
            `sidebar-link group relative ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'justify-center px-0' : ''}`
          }
        >
          <Settings className={`shrink-0 transition-transform duration-200 group-hover:rotate-45 ${collapsed && !isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          {(!collapsed || isMobile) && <span className="sidebar-label text-sm">Pengaturan</span>}
          {collapsed && !isMobile && (
            <span
              className="
                absolute left-full ml-3 px-3 py-2 rounded-xl
                bg-foreground text-background text-xs font-semibold whitespace-nowrap
                opacity-0 pointer-events-none group-hover:opacity-100
                translate-x-2 group-hover:translate-x-0
                transition-all duration-200 ease-out
                shadow-xl border border-border/20
              "
              style={{ zIndex: 999999 }}
            >
              Pengaturan
              <span className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-foreground" />
            </span>
          )}
        </NavLink>

        {/* User info */}
        <div className={`
          flex items-center gap-2.5 mt-3 pt-3 border-t border-white/8
          ${collapsed && !isMobile ? 'justify-center px-0' : 'px-2'}
        `}>
          <div className="
            w-8 h-8 rounded-xl bg-gradient-to-br from-white/20 to-white/8
            flex items-center justify-center shrink-0
            border border-white/12 text-white font-bold text-xs
          ">
            {initial}
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0 sidebar-label">
              <p className="text-xs font-semibold text-white/85 truncate">{username}</p>
              <p className="text-[10px] text-white/35 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            title="Keluar"
            className="text-white/30 hover:text-red-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-400/10"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          fixed top-3.5 left-3.5 z-50 lg:hidden
          p-2 rounded-xl bg-card border border-border shadow-sm
          active:scale-95 transition-transform
        "
        aria-label="Buka menu"
      >
        <Menu className="w-4.5 h-4.5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
          onClick={closeMobile}
          style={{ opacity: 0 }}
        />
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside
          ref={mobileRef}
          className="fixed left-0 top-0 bottom-0 w-[260px] z-[70] lg:hidden flex flex-col shadow-2xl"
          style={{ background: 'hsl(var(--sidebar-bg))', transform: 'translateX(-100%)' }}
        >
          {sidebarContent(true)}
        </aside>
      )}

      {/* Desktop sidebar */}
      <aside
        ref={sidebarRef}
        className={`hidden lg:flex flex-col h-screen sticky top-0 z-40 border-r border-white/5 transition-none ${collapsed ? 'w-[68px]' : 'w-60'}`}
        style={{ background: 'hsl(var(--sidebar-bg))' }}
      >
        {/* Collapse toggle */}
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