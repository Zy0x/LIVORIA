import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CatatanFormValues, CatatanItem } from '../types/catatan.types';
import { CATATAN_COLORS } from '../types/catatan.types';

type CatatanFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: CatatanItem | null;
  form: CatatanFormValues;
  setForm: Dispatch<SetStateAction<CatatanFormValues>>;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CatatanFormDialog({
  open,
  onOpenChange,
  editItem,
  form,
  setForm,
  isPending,
  onSubmit,
}: CatatanFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display pr-7">{editItem ? 'Edit Catatan' : 'Tambah Catatan'}</DialogTitle>
          <DialogDescription>
            Simpan catatan singkat, ide, atau informasi personal yang ingin mudah ditemukan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-w-0 space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Judul *</label>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="cth: Ide fitur berikutnya"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Isi Catatan</label>
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder="Tulis catatan..."
              rows={8}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all resize-y min-h-[180px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tag</label>
              <input
                value={form.tagsText}
                onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
                placeholder="kerja, ide, pribadi"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Warna</label>
              <select
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value as CatatanFormValues['color'] })}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              >
                {CATATAN_COLORS.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(event) => setForm({ ...form, is_pinned: event.target.checked })}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Sematkan catatan ini di bagian atas.
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isPending ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
