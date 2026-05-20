import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

type TagihanInfoTooltipProps = {
  text: string;
};

export function TagihanInfoTooltip({ text }: TagihanInfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [arrowLeft, setArrowLeft] = useState<number>(112);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const btnRef = useRef<HTMLButtonElement>(null);

  const tooltipWidth = 224;
  const edgeGap = 8;

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const above = rect.top;
    const below = vh - rect.bottom;
    const place: 'top' | 'bottom' = above >= 90 || above >= below ? 'top' : 'bottom';
    const idealLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const clampedLeft = Math.max(edgeGap, Math.min(idealLeft, vw - tooltipWidth - edgeGap));
    const rawArrow = rect.left + rect.width / 2 - clampedLeft;

    setPlacement(place);
    setArrowLeft(Math.max(12, Math.min(rawArrow, tooltipWidth - 12)));
    setStyle({
      left: clampedLeft,
      position: 'fixed',
      width: tooltipWidth,
      zIndex: 9999,
      ...(place === 'top' ? { bottom: vh - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }, []);

  const show = useCallback(() => {
    calcPos();
    setVisible(true);
  }, [calcPos]);
  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return;
    const handler = () => calcPos();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [visible, calcPos]);

  return (
    <span className="relative inline-flex items-center">
      <button
        aria-label="Info"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-info/20 text-info hover:bg-info/35 transition-colors focus:outline-none focus:ring-2 focus:ring-info/30 ml-1.5 shrink-0"
        onBlur={hide}
        onClick={() => (visible ? hide() : show())}
        onFocus={show}
        onMouseEnter={show}
        onMouseLeave={hide}
        ref={btnRef}
        type="button"
      >
        <Info className="w-2.5 h-2.5" />
      </button>

      {visible &&
        createPortal(
          <div
            className="px-3 py-2.5 rounded-xl bg-foreground text-background text-[11px] leading-relaxed shadow-xl pointer-events-none"
            role="tooltip"
            style={style}
          >
            {text}
            <span
              className={`absolute border-4 border-transparent ${
                placement === 'top' ? 'top-full border-t-foreground' : 'bottom-full border-b-foreground'
              }`}
              style={{ left: arrowLeft, transform: 'translateX(-50%)' }}
            />
          </div>,
          document.body,
        )}
    </span>
  );
}
