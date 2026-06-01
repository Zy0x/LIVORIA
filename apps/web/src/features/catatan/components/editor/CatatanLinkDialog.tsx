import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { applyCatatanLink } from './catatan-editor.commands';

type CatatanLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

export function CatatanLinkDialog({ open, onOpenChange, editor }: CatatanLinkDialogProps) {
  const [url, setUrl] = useState('https://');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!open || !editor) return;
    setUrl(String(editor.getAttributes('link').href || 'https://'));
    const { from, to } = editor.state.selection;
    setLabel(from !== to ? editor.state.doc.textBetween(from, to, ' ') : '');
  }, [editor, open]);

  const apply = () => {
    if (!editor) return;
    applyCatatanLink(editor, { url, label });
    onOpenChange(false);
  };

  const remove = () => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(34rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Tambahkan Tautan</DialogTitle>
          <DialogDescription>Gunakan URL, email, atau nomor telepon. Input diproses tanpa prompt browser.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            URL
            <Input value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1.5" placeholder="https://livoria.web.id" />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Label opsional
            <Input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-1.5" placeholder="Teks yang ditampilkan" />
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={remove} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Hapus Link
            </button>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
              Batal
            </button>
            <button type="button" onClick={apply} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Terapkan
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
