import { useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { insertCatatanDrawing } from './catatan-editor.commands';

type CatatanDrawingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

type ShapeType = 'line' | 'rectangle' | 'circle' | 'arrow' | 'callout';
type DrawMode = 'pen' | 'eraser';
type Stroke = {
  id: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

const SHAPES: Array<{ label: string; value: ShapeType }> = [
  { label: 'Line', value: 'line' },
  { label: 'Rectangle', value: 'rectangle' },
  { label: 'Circle', value: 'circle' },
  { label: 'Arrow', value: 'arrow' },
  { label: 'Callout', value: 'callout' },
];

export function CatatanDrawingDialog({ open, onOpenChange, editor }: CatatanDrawingDialogProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [shape, setShape] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#10b981');
  const [label, setLabel] = useState('Shape');
  const [mode, setMode] = useState<DrawMode>('pen');
  const [width, setWidth] = useState(5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStrokeId, setActiveStrokeId] = useState<string | null>(null);

  const svg = useMemo(() => {
    if (shape === 'line') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><line x1="36" y1="104" x2="284" y2="36" stroke="${color}" stroke-width="8" stroke-linecap="round"/></svg>`;
    if (shape === 'circle') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><circle cx="160" cy="70" r="48" fill="none" stroke="${color}" stroke-width="8"/></svg>`;
    if (shape === 'arrow') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><path d="M40 70h220" stroke="${color}" stroke-width="8" stroke-linecap="round"/><path d="M230 38l40 32-40 32" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (shape === 'callout') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><path d="M48 28h224a16 16 0 0 1 16 16v48a16 16 0 0 1-16 16H128l-42 24 12-24H48a16 16 0 0 1-16-16V44a16 16 0 0 1 16-16z" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="6"/></svg>`;
    return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><rect x="58" y="28" width="204" height="84" rx="16" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="8"/></svg>`;
  }, [color, shape]);

  const drawingSvg = useMemo(() => {
    const paths = strokes.map((stroke) => {
      const d = stroke.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
      return `<path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join('');
    return `<svg viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="320" rx="18" fill="transparent"/>${paths}</svg>`;
  }, [strokes]);

  const pointerPoint = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 640,
      y: ((event.clientY - rect.top) / rect.height) * 320,
    };
  };

  const eraseNear = (point: { x: number; y: number }) => {
    setStrokes((current) => current.filter((stroke) => {
      return !stroke.points.some((candidate) => {
        const dx = candidate.x - point.x;
        const dy = candidate.y - point.y;
        return Math.sqrt(dx * dx + dy * dy) < Math.max(14, width * 3);
      });
    }));
  };

  const startDrawing = (event: PointerEvent<SVGSVGElement>) => {
    const point = pointerPoint(event);
    if (mode === 'eraser') {
      eraseNear(point);
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setActiveStrokeId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setStrokes((current) => [...current, { id, color, width, points: [point] }]);
  };

  const continueDrawing = (event: PointerEvent<SVGSVGElement>) => {
    const point = pointerPoint(event);
    if (mode === 'eraser') {
      if (event.buttons > 0) eraseNear(point);
      return;
    }
    if (!activeStrokeId || event.buttons === 0) return;
    setStrokes((current) => current.map((stroke) => (
      stroke.id === activeStrokeId ? { ...stroke, points: [...stroke.points, point] } : stroke
    )));
  };

  const stopDrawing = (event: PointerEvent<SVGSVGElement>) => {
    if (activeStrokeId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveStrokeId(null);
  };

  const apply = (svgValue = strokes.length > 0 ? drawingSvg : svg) => {
    if (!editor) return;
    insertCatatanDrawing(editor, { svg: svgValue, title: label || shape });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(46rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Drawing dan Shapes</DialogTitle>
          <DialogDescription>Tambahkan shape ringan. Drawing bebas penuh bisa dikembangkan di atas struktur ini.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
          <div className="space-y-3">
            <svg
              ref={svgRef}
              viewBox="0 0 640 320"
              className="h-[220px] w-full touch-none rounded-xl border border-border bg-muted/20 sm:h-[320px]"
              onPointerDown={startDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
            >
              {strokes.map((stroke) => (
                <polyline
                  key={stroke.id}
                  points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
            <div className="rounded-xl border border-border bg-muted/20 p-4" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          <div className="space-y-3">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label shape" />
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode('pen')} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'pen' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Pen
              </button>
              <button type="button" onClick={() => setMode('eraser')} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'eraser' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Eraser
              </button>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Ketebalan {width}px
              <input type="range" min={2} max={18} value={width} onChange={(event) => setWidth(Number(event.target.value))} className="mt-2 w-full accent-primary" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStrokes((current) => current.slice(0, -1))} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground">
                Undo
              </button>
              <button type="button" onClick={() => setStrokes([])} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground">
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SHAPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setShape(item.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${shape === item.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => apply()} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              {strokes.length > 0 ? 'Masukkan Drawing' : 'Masukkan Shape'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
