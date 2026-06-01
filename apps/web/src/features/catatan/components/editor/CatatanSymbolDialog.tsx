import { useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SYMBOL_TEMPLATES } from './catatan-editor-presets';

type CatatanSymbolDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

export function CatatanSymbolDialog({ open, onOpenChange, editor }: CatatanSymbolDialogProps) {
  const [category, setCategory] = useState('Math');
  const categories = useMemo(() => Array.from(new Set(SYMBOL_TEMPLATES.map((item) => item.category))), []);

  const insert = (symbol: string) => {
    editor?.chain().focus().insertContent(symbol).run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(40rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Simbol</DialogTitle>
          <DialogDescription>Masukkan simbol umum untuk matematika, currency, arrows, dan teks.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {SYMBOL_TEMPLATES.filter((item) => item.category === category).map((item) => (
            <button
              key={`${item.category}-${item.label}`}
              type="button"
              onClick={() => insert(item.symbol)}
              className="rounded-xl border border-border bg-card p-3 text-center text-xl font-bold hover:border-primary/50"
              title={item.label}
            >
              {item.symbol}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
