/**
 * CoverLightbox.tsx — LIVORIA (Fixed v5)
 *
 * Perbaikan:
 * 1. Klik di luar gambar (backdrop) SELALU menutup lightbox
 * 2. Double-click di luar gambar TIDAK zoom — hanya zoom jika klik di area gambar
 * 3. Area interaksi gambar (drag/zoom) dibatasi hanya di dalam wrapper gambar
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.3;

export default function CoverLightbox({ open, onClose, imageUrl, title }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const offsetAtDragRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const lastTouchDistRef = useRef<number | null>(null);
  // Ref untuk melacak apakah pointer down berasal dari area gambar
  const pointerOnImageRef = useRef(false);

  // Reset state saat open atau ganti gambar
  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
      pointerOnImageRef.current = false;
    }
  }, [open, imageUrl]);

  // Keyboard + force enable pointer events (fix Radix Dialog)
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      }
      if (e.key === '-') {
        setZoom(z => {
          const n = Math.max(MIN_ZOOM, z - ZOOM_STEP);
          if (n <= 1) setOffset({ x: 0, y: 0 });
          return n;
        });
      }
      if (e.key === '0') {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handler, true);

    // Fix Radix Dialog yang sering meninggalkan pointer-events: none
    const originalBodyPointer = document.body.style.pointerEvents;
    document.body.style.pointerEvents = 'auto';

    return () => {
      window.removeEventListener('keydown', handler, true);
      document.body.style.pointerEvents = originalBodyPointer || '';
    };
  }, [open, onClose]);

  const stopAll = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    (e.nativeEvent as Event)?.stopImmediatePropagation?.();
  };

  // ── Backdrop: SELALU tutup saat diklik ──────────────────────────────────────
  // Backdrop adalah elemen terpisah di belakang gambar, jadi klik di sini
  // berarti user klik di luar gambar. Selalu tutup.
  const handleBackdropPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      (e.nativeEvent as Event)?.stopImmediatePropagation?.();
      onClose();
    },
    [onClose]
  );

  // Wheel zoom — hanya pada area gambar (wrapper)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => {
      const n = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      if (n <= 1) setOffset({ x: 0, y: 0 });
      return n;
    });
  }, []);

  // ── Area gambar: pointer down → mulai drag ──────────────────────────────────
  const handleImageAreaPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.nativeEvent as Event)?.stopImmediatePropagation?.();
      pointerOnImageRef.current = true;
      if (zoom <= 1) return;

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      offsetAtDragRef.current = { x: offset.x, y: offset.y };
    },
    [zoom, offset]
  );

  const handleImageAreaPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      e.stopPropagation();
      setOffset({
        x: offsetAtDragRef.current.x + (e.clientX - dragStartRef.current.x),
        y: offsetAtDragRef.current.y + (e.clientY - dragStartRef.current.y),
      });
    },
    [isDragging]
  );

  const handleImageAreaPointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    dragStartRef.current = null;
    pointerOnImageRef.current = false;
  }, []);

  // ── Double click: HANYA di area gambar ─────────────────────────────────────
  const handleImageAreaDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      stopAll(e);
      if (zoom > 1) {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      } else {
        setZoom(2.5);
      }
    },
    [zoom]
  );

  // Touch events (pinch + drag + double tap) — hanya di area gambar
  const handleImageAreaTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistRef.current = Math.hypot(dx, dy);
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          if (zoom > 1) {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          } else {
            setZoom(2.5);
          }
        }
        lastTapRef.current = now;

        if (zoom > 1) {
          dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          offsetAtDragRef.current = { x: offset.x, y: offset.y };
        }
      }
    },
    [zoom, offset]
  );

  const handleImageAreaTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const scale = newDist / lastTouchDistRef.current;
        lastTouchDistRef.current = newDist;

        setZoom(z => {
          const n = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * scale));
          if (n <= 1) setOffset({ x: 0, y: 0 });
          return n;
        });
      } else if (e.touches.length === 1 && dragStartRef.current && zoom > 1) {
        setOffset({
          x: offsetAtDragRef.current.x + (e.touches[0].clientX - dragStartRef.current.x),
          y: offsetAtDragRef.current.y + (e.touches[0].clientY - dragStartRef.current.y),
        });
      }
    },
    [zoom]
  );

  const handleImageAreaTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    lastTouchDistRef.current = null;
    dragStartRef.current = null;
    setIsDragging(false);
  }, []);

  // Helper tombol toolbar
  const makeBtn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    disabled = false
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.nativeEvent as Event)?.stopImmediatePropagation?.();
        if (!disabled) action();
      }}
      onClick={stopAll}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'transparent',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        touchAction: 'manipulation',
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );

  if (!open) return null;

  const zoomPct = Math.round(zoom * 100);

  return createPortal(
    <>
      {/* ── Backdrop: lapisan tersendiri, SELALU menutup saat diklik ── */}
      <div
        onPointerDown={handleBackdropPointerDown}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999998,
          background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />

      {/* ── Container konten — hanya untuk layout, TIDAK menangkap event ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none', // container transparan — event menembus ke backdrop
        }}
      >
        {/* Tombol Close */}
        <button
          type="button"
          aria-label="Tutup"
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.nativeEvent as Event)?.stopImmediatePropagation?.();
            onClose();
          }}
          onClick={stopAll}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.75)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            touchAction: 'manipulation',
            pointerEvents: 'auto',
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>

        {/* Hint */}
        {zoom <= 1 && (
          <p
            style={{
              position: 'absolute',
              top: 22,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 11,
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Scroll / cubit untuk zoom · Double klik gambar = 2.5×
          </p>
        )}

        {/* ── Area Interaksi Gambar ──────────────────────────────────────────
            Hanya area ini yang menangkap event zoom/drag/double-click.
            Dibuat pas ukuran gambar agar klik DI LUAR gambar menembus ke backdrop.
        ── */}
        <div
          onPointerDown={handleImageAreaPointerDown}
          onPointerMove={handleImageAreaPointerMove}
          onPointerUp={handleImageAreaPointerUp}
          onPointerCancel={handleImageAreaPointerUp}
          onDoubleClick={handleImageAreaDoubleClick}
          onWheel={handleWheel}
          onTouchStart={handleImageAreaTouchStart}
          onTouchMove={handleImageAreaTouchMove}
          onTouchEnd={handleImageAreaTouchEnd}
          onClick={stopAll}
          style={{
            // Ukuran dibatasi agar pas dengan gambar — klik di luar menembus ke backdrop
            maxWidth: '88vw',
            maxHeight: '88vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none',
            userSelect: 'none',
            overflow: 'visible',
            pointerEvents: 'auto',
          }}
        >
          <img
            src={imageUrl}
            alt={title || 'Cover'}
            draggable={false}
            style={{
              maxWidth: zoom <= 1 ? '88vw' : undefined,
              maxHeight: zoom <= 1 ? '88vh' : undefined,
              objectFit: 'contain',
              borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'block',
            }}
          />
        </div>

        {/* Toolbar Zoom */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.nativeEvent as Event)?.stopImmediatePropagation?.();
          }}
          onClick={stopAll}
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,0,0,0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 99,
            padding: '4px 14px',
            pointerEvents: 'auto',
          }}
        >
          {makeBtn(
            'Zoom out',
            <ZoomOut style={{ width: 16, height: 16 }} />,
            () => setZoom(z => { const n = Math.max(MIN_ZOOM, z - ZOOM_STEP); if (n <= 1) setOffset({ x: 0, y: 0 }); return n; }),
            zoom <= MIN_ZOOM
          )}

          <button
            type="button"
            title="Reset zoom"
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.nativeEvent as Event)?.stopImmediatePropagation?.();
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
            onClick={stopAll}
            style={{
              minWidth: 48,
              textAlign: 'center',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              fontFamily: 'monospace',
              cursor: 'pointer',
              touchAction: 'manipulation',
              pointerEvents: 'auto',
            }}
          >
            {zoomPct}%
          </button>

          {makeBtn(
            'Zoom in',
            <ZoomIn style={{ width: 16, height: 16 }} />,
            () => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP)),
            zoom >= MAX_ZOOM
          )}

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

          {makeBtn(
            'Fit ke layar',
            <Maximize2 style={{ width: 14, height: 14 }} />,
            () => { setZoom(1); setOffset({ x: 0, y: 0 }); }
          )}
        </div>
      </div>
    </>,
    document.body
  );
}