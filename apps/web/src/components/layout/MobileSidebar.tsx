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
          h-11 w-11 items-center justify-center rounded-[0.9rem] bg-card border border-border shadow-sm
          active:scale-95 transition-transform pointer-events-auto touch-manipulation
        "
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 0.375rem)',
          left: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2.5} />
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
