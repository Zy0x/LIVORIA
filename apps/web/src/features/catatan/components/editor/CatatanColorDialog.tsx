import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HIGHLIGHT_PRESETS, TEXT_COLOR_PRESETS, type ColorPreset } from './catatan-editor-presets';

type CatatanColorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
  mode: 'text' | 'highlight';
};

export function CatatanColorDialog({ open, onOpenChange, editor, mode }: CatatanColorDialogProps) {
  const presets = mode === 'text' ? TEXT_COLOR_PRESETS : HIGHLIGHT_PRESETS;
  const [custom, setCustom] = useState('#10b981');

  const apply = (color: string) => {
    if (!editor) return;
    if (!color) {
      editor.chain().focus().unsetColor().unsetHighlight().run();
    } else if (mode === 'text') {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(36rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>{mode === 'text' ? 'Warna Teks' : 'Highlight'}</DialogTitle>
          <DialogDescription>Pilih template atau masukkan warna custom HEX/RGB/HSL.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((item: ColorPreset) => (
            <button
              key={`${item.label}-${item.value}`}
              type="button"
              onClick={() => apply(item.value)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 text-left text-xs font-bold hover:border-primary/50"
            >
              <span className="h-7 w-7 rounded-lg border border-border" style={{ background: item.value || 'hsl(var(--foreground))' }} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[4rem_1fr_auto]">
          <input type="color" value={custom.startsWith('#') ? custom : '#10b981'} onChange={(event) => setCustom(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background" />
          <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="#10b981 / rgb(16,185,129)" />
          <button type="button" onClick={() => apply(custom)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Terapkan
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
