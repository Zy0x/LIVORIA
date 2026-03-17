import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Receipt, Tv, Film, Heart, Pill,
  Settings, LogOut, ChevronLeft, Menu, Shield, X
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tagihan', icon: Receipt, label: 'Tagihan' },
  { to: '/anime', icon: Tv, label: 'Anime' },
  { to: '/donghua', icon: Film, label: 'Donghua' },
  { to: '/waifu', icon: Heart, label: 'Waifu' },
  { to: '/obat', icon: Pill, label: 'Obat' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLElement>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const isAnimating = useRef(false);

  // Desktop sidebar smooth entry
  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(sidebarRef.current,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, []);

  // Animate nav items on route change with stagger
  useEffect(() => {
    const validRefs = navRefs.current.filter(Boolean);
    if (validRefs.length > 0) {
      gsap.fromTo(validRefs,
        { x: -6, opacity: 0.6 },
        { x: 0, opacity: 1, stagger: 0.03, duration: 0.25, ease: 'power2.out' }
      );
    }
  }, [location.pathname]);

  // Mobile open with spring-like animation
  useEffect(() => {
    if (mobileOpen) {
      if (overlayRef.current) {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
      }
      if (mobileRef.current) {
        gsap.fromTo(mobileRef.current,
          { x: '-100%' },
          { x: '0%', duration: 0.4, ease: 'power3.out' }
        );
        // Stagger nav items entrance
        const navLinks = mobileRef.current.querySelectorAll('.sidebar-link');
        gsap.fromTo(navLinks,
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.04, duration: 0.3, ease: 'power2.out', delay: 0.15 }
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
    if (mobileRef.current) tl.to(mobileRef.current, { x: '-100%', duration: 0.3, ease: 'power2.in' }, 0);
    if (overlayRef.current) tl.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power1.in' }, 0);
  }, []);

  // Smooth collapse with content fade
  const handleCollapse = useCallback(() => {
    if (!sidebarRef.current || isAnimating.current) return;
    isAnimating.current = true;
    const newCollapsed = !collapsed;
    const labels = sidebarRef.current.querySelectorAll('.sidebar-label');

    const tl = gsap.timeline({
      onComplete: () => { setCollapsed(newCollapsed); isAnimating.current = false; },
    });

    // Fade out labels first, then resize
    if (!newCollapsed) {
      tl.to(sidebarRef.current, { width: 256, duration: 0.3, ease: 'power2.inOut' }, 0);
      tl.fromTo(labels, { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.02, duration: 0.2 }, 0.15);
    } else {
      tl.to(labels, { opacity: 0, x: -10, stagger: 0.02, duration: 0.15 }, 0);
      tl.to(sidebarRef.current, { width: 72, duration: 0.3, ease: 'power2.inOut' }, 0.1);
    }
  }, [collapsed]);

  const sidebarContent = (isMobile = false) => (
    <>
      <div className="flex items-center gap-3 px-4 py-5 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shrink-0">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden sidebar-label">
            <h2 className="font-display font-bold text-base text-foreground leading-tight">LIVORIA</h2>
            <p className="text-xs text-muted-foreground truncate">Personal Archive</p>
          </div>
        )}
        {isMobile && (
          <button onClick={closeMobile} className="ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {!collapsed && <p className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 sidebar-label">Menu Utama</p>}

      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }, i) => (
          <NavLink
            key={to}
            to={to}
            ref={el => { navRefs.current[i] = el; }}
            onClick={() => isMobile && closeMobile()}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
            }
            end={to === '/'}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="sidebar-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-4 mt-auto space-y-1">
        {!collapsed && <p className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 sidebar-label">Lainnya</p>}
        <NavLink
          to="/settings"
          onClick={() => isMobile && closeMobile()}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="sidebar-label">Pengaturan</span>}
        </NavLink>

        <div className={`flex items-center gap-3 px-4 py-3 border-t border-border mt-3 pt-4 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 sidebar-label">
              <p className="text-sm font-medium text-foreground truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Keluar">
            <LogOut className="w-4 h-4" />
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
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-card border border-border shadow-md active:scale-95 transition-transform"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobile}
          style={{ opacity: 0 }}
        />
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside ref={mobileRef} className="fixed left-0 top-0 bottom-0 w-[280px] z-50 lg:hidden flex flex-col shadow-2xl"
          style={{ background: 'hsl(var(--sidebar-bg))', transform: 'translateX(-100%)' }}>
          {sidebarContent(true)}
        </aside>
      )}

      {/* Desktop sidebar */}
      <aside
        ref={sidebarRef}
        className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-border ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
        style={{ background: 'hsl(var(--sidebar-bg))' }}
      >
        <button
          onClick={handleCollapse}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center z-10 hover:bg-accent transition-colors active:scale-90"
        >
          <ChevronLeft className={`w-3 h-3 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
        {sidebarContent()}
      </aside>
    </>
  );
}
