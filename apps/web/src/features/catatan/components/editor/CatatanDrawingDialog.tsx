import { useMemo, useState } from 'react';
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

const SHAPES: Array<{ label: string; value: ShapeType }> = [
  { label: 'Line', value: 'line' },
  { label: 'Rectangle', value: 'rectangle' },
  { label: 'Circle', value: 'circle' },
  { label: 'Arrow', value: 'arrow' },
  { label: 'Callout', value: 'callout' },
];

export function CatatanDrawingDialog({ open, onOpenChange, editor }: CatatanDrawingDialogProps) {
  const [shape, setShape] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#10b981');
  const [label, setLabel] = useState('Shape');

  const svg = useMemo(() => {
    if (shape === 'line') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><line x1="36" y1="104" x2="284" y2="36" stroke="${color}" stroke-width="8" stroke-linecap="round"/></svg>`;
    if (shape === 'circle') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><circle cx="160" cy="70" r="48" fill="none" stroke="${color}" stroke-width="8"/></svg>`;
    if (shape === 'arrow') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><path d="M40 70h220" stroke="${color}" stroke-width="8" stroke-linecap="round"/><path d="M230 38l40 32-40 32" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (shape === 'callout') return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><path d="M48 28h224a16 16 0 0 1 16 16v48a16 16 0 0 1-16 16H128l-42 24 12-24H48a16 16 0 0 1-16-16V44a16 16 0 0 1 16-16z" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="6"/></svg>`;
    return `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><rect x="58" y="28" width="204" height="84" rx="16" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="8"/></svg>`;
  }, [color, shape]);

  const apply = () => {
    if (!editor) return;
    insertCatatanDrawing(editor, { svg, title: label || shape });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(46rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Drawing dan Shapes</DialogTitle>
          <DialogDescription>Tambahkan shape ringan. Drawing bebas penuh bisa dikembangkan di atas struktur ini.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="rounded-xl border border-border bg-muted/20 p-4" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="space-y-3">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label shape" />
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background" />
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
            <button type="button" onClick={apply} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Masukkan Shape
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
