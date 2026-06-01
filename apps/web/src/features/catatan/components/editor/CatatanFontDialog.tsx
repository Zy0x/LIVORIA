import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FONT_FAMILIES, FONT_SIZES } from './catatan-editor-presets';
import { setCatatanFontSize } from './catatan-editor.commands';

type CatatanFontDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

export function CatatanFontDialog({ open, onOpenChange, editor }: CatatanFontDialogProps) {
  const [fontSize, setFontSize] = useState('16px');

  const applyFamily = (family: string) => {
    if (!editor) return;
    if (!family) editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(family).run();
  };

  const applySize = (size: string) => {
    if (!editor) return;
    setCatatanFontSize(editor, size);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(44rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Font dan Ukuran</DialogTitle>
          <DialogDescription>Default mengikuti font web LIVORIA. Gunakan font khusus hanya untuk bagian catatan yang dipilih.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FONT_FAMILIES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => applyFamily(item.value)}
              className="rounded-xl border border-border bg-card p-3 text-left text-sm font-bold hover:border-primary/50"
              style={{ fontFamily: item.value || undefined }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {FONT_SIZES.map((size) => (
            <button key={size} type="button" onClick={() => applySize(size)} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50">
              {size}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input value={fontSize} onChange={(event) => setFontSize(event.target.value)} placeholder="cth: 17px, 1.2rem" />
          <button type="button" onClick={() => applySize(fontSize)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Terapkan Ukuran
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
