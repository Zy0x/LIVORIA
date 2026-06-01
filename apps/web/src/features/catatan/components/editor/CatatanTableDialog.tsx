import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { insertCatatanTable } from './catatan-editor.commands';

type CatatanTableDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
};

const TABLE_STYLES = [
  { label: 'Default', value: 'default' },
  { label: 'Zebra', value: 'zebra' },
  { label: 'Compact', value: 'compact' },
  { label: 'Header Sage', value: 'sage-header' },
];

export function CatatanTableDialog({ open, onOpenChange, editor }: CatatanTableDialogProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const [style, setStyle] = useState('default');

  const apply = () => {
    if (!editor) return;
    insertCatatanTable(editor, { rows, cols, withHeaderRow, style });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(34rem,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>Tabel Catatan</DialogTitle>
          <DialogDescription>Atur ukuran tabel awal. Baris dan kolom bisa ditambah lagi dari ribbon Layout.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-foreground">
            Baris
            <Input type="number" min={1} max={30} value={rows} onChange={(event) => setRows(Number(event.target.value) || 1)} className="mt-1.5" />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Kolom
            <Input type="number" min={1} max={20} value={cols} onChange={(event) => setCols(Number(event.target.value) || 1)} className="mt-1.5" />
          </label>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-sm font-semibold">
          <input type="checkbox" checked={withHeaderRow} onChange={(event) => setWithHeaderRow(event.target.checked)} className="h-4 w-4 accent-primary" />
          Gunakan header baris pertama
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TABLE_STYLES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStyle(item.value)}
              className={`rounded-xl border px-3 py-3 text-sm font-bold ${style === item.value ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-muted-foreground'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
            Batal
          </button>
          <button type="button" onClick={apply} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Buat Tabel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
