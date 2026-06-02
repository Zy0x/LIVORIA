import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { PointerEvent, RefObject } from 'react';
import { SCROLL_BUTTON_RAISED_BOTTOM, type ScrollDirection } from './floating-action-config';

interface FloatingActionControlsProps {
  addButtonRef: RefObject<HTMLButtonElement>;
  scrollButtonRef: RefObject<HTMLButtonElement>;
  direction: ScrollDirection;
  isAddRoute: boolean;
  isScrollVisible: boolean;
  showAddButton: boolean;
  shouldRaiseScrollButton: boolean;
  overlaySuppressed: boolean;
  onAddClick: () => void;
  onScrollClick: () => void;
}

export function FloatingActionControls({
  addButtonRef,
  scrollButtonRef,
  direction,
  isAddRoute,
  isScrollVisible,
  showAddButton,
  shouldRaiseScrollButton,
  overlaySuppressed,
  onAddClick,
  onScrollClick,
}: FloatingActionControlsProps) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;
  const canShowAdd = showAddButton && !overlaySuppressed;
  const canShowScroll = isScrollVisible && !overlaySuppressed;

  const runPointerAction = (event: PointerEvent<HTMLButtonElement>, action: () => void) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    action();
  };

  return (
    <div className="floating-action-controls pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))] z-40 h-[7.875rem] w-12 sm:w-14">
      {isAddRoute && (
        <div
          className="absolute bottom-0 right-0 h-12 w-12 sm:h-14 sm:w-14"
        >
          <button
            ref={addButtonRef}
            type="button"
            onClick={(event) => {
              if (event.detail === 0) onAddClick();
            }}
            onPointerDown={(event) => runPointerAction(event, onAddClick)}
            aria-label="Tambah data baru"
            data-visible={canShowAdd ? 'true' : 'false'}
            className={`absolute inset-0 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl transition-[opacity,transform] duration-200 ease-out sm:h-14 sm:w-14 ${
              canShowAdd ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-90 opacity-0'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
              pointerEvents: canShowAdd ? 'auto' : 'none',
              willChange: 'opacity, transform',
            }}
          >
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.6} />
          </button>
        </div>
      )}

      <div
        className="absolute right-0 h-12 w-12 transition-[bottom] duration-300 ease-out sm:h-14 sm:w-14"
        style={{ bottom: shouldRaiseScrollButton ? SCROLL_BUTTON_RAISED_BOTTOM : 0 }}
      >
        <button
          ref={scrollButtonRef}
          type="button"
          onClick={(event) => {
            if (event.detail === 0) onScrollClick();
          }}
          onPointerDown={(event) => runPointerAction(event, onScrollClick)}
          aria-label={direction === 'up' ? 'Scroll ke atas' : 'Scroll ke bawah'}
          data-visible={canShowScroll ? 'true' : 'false'}
          className={`absolute inset-0 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 shadow-xl transition-[opacity,transform,background-color] duration-200 ease-out sm:h-14 sm:w-14 ${
            direction === 'up'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
              : 'bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500'
          } ${canShowScroll ? 'translate-y-0 scale-100 opacity-95' : 'translate-y-3 scale-90 opacity-0'} touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          style={{
            WebkitTapHighlightColor: 'transparent',
            pointerEvents: canShowScroll ? 'auto' : 'none',
            willChange: 'opacity, transform',
          }}
        >
          <Icon
            key={direction}
            className="scroll-icon h-2.5 w-2.5 text-white drop-shadow-sm animate-in fade-in zoom-in-75 duration-150 sm:h-3.5 sm:w-3.5"
            strokeWidth={4}
          />
        </button>
      </div>
    </div>
  );
}
