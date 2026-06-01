import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CODE_LANGUAGES } from './catatan-editor-presets';

type CatatanCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

export function CatatanCodeDialog({ open, onOpenChange, editor }: CatatanCodeDialogProps) {
  const [language, setLanguage] = useState('auto');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!open || !editor) return;
    setLanguage(String(editor.getAttributes('codeBlock').language || 'auto'));
  }, [editor, open]);

  const apply = (value = language) => {
    if (!editor) return;
    const nextLanguage = value === 'custom' ? custom.trim() : value;
    const attrs = { language: nextLanguage === 'auto' ? null : nextLanguage };
    if (editor.isActive('codeBlock')) editor.chain().focus().updateAttributes('codeBlock', attrs).run();
    else editor.chain().focus().setCodeBlock(attrs).run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(44rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Code Block</DialogTitle>
          <DialogDescription>Pilih bahasa untuk bar kecil di atas code block dan syntax highlighting.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CODE_LANGUAGES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setLanguage(item);
                apply(item);
              }}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold capitalize hover:border-primary/50"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Bahasa custom, cth: powershell" />
          <button type="button" onClick={() => apply('custom')} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Terapkan Custom
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
