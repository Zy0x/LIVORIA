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
        onClick={onOpen}
        onPointerUp={(event) => {
          if (event.pointerType === 'touch') {
            event.preventDefault();
            onOpen();
          }
        }}
        className="
          fixed top-3.5 left-3.5 z-[80] lg:hidden
          p-2 rounded-xl bg-card border border-border shadow-sm
          active:scale-95 transition-transform pointer-events-auto touch-manipulation
        "
        aria-label="Buka menu"
      >
        <Menu className="w-4.5 h-4.5" />
      </button>

      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden touch-manipulation"
          onClick={onClose}
          style={{ opacity: 0 }}
        />
      )}

      {mobileOpen && (
        <aside
          ref={mobileRef}
          className="fixed left-0 top-0 bottom-0 w-[260px] z-[90] lg:hidden flex flex-col shadow-2xl touch-manipulation"
          style={{ background: 'hsl(var(--sidebar-bg))', transform: 'translateX(-100%)' }}
        >
          {children}
        </aside>
      )}
    </>
  );
}
