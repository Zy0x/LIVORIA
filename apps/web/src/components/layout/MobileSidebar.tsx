import type { ReactNode, RefObject } from 'react';
import { Menu } from 'lucide-react';

interface MobileSidebarProps {
  mobileOpen: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  mobileRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function MobileSidebar({
  mobileOpen,
  overlayRef,
  mobileRef,
  onOpen,
  onClose,
  children,
}: MobileSidebarProps) {
  return (
    <>
      <button
        onPointerDown={(event) => {
          if (event.pointerType === 'touch') {
            onOpen();
          }
        }}
        onClick={onOpen}
        onPointerUp={(event) => {
          if (event.pointerType === 'touch') {
            event.preventDefault();
            onOpen();
          }
        }}
        className="
          mobile-sidebar-trigger fixed z-[45] flex lg:hidden
          h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border shadow-sm
          active:scale-95 transition-transform pointer-events-auto touch-manipulation
        "
        style={{
          top: 'max(0.875rem, env(safe-area-inset-top))',
          left: 'max(0.875rem, env(safe-area-inset-left))',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Buka menu"
      >
        <Menu className="h-6 w-6" strokeWidth={2.4} />
      </button>

      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[46] lg:hidden touch-manipulation"
          onClick={onClose}
          style={{ opacity: 0 }}
        />
      )}

      {mobileOpen && (
        <aside
          ref={mobileRef}
          className="fixed left-0 top-0 bottom-0 w-[260px] z-[47] lg:hidden flex flex-col shadow-2xl touch-manipulation"
          style={{ background: 'hsl(var(--sidebar-bg))', transform: 'translateX(-100%)' }}
        >
          {children}
        </aside>
      )}
    </>
  );
}
