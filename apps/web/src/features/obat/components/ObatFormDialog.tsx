import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ObatFormValues, ObatItem } from '../types/obat.types';
import { OBAT_TYPES } from '../types/obat.types';

type ObatFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: ObatItem | null;
  form: ObatFormValues;
  setForm: Dispatch<SetStateAction<ObatFormValues>>;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ObatFormDialog({
  open,
  onOpenChange,
  editItem,
  form,
  setForm,
  isPending,
  onSubmit,
}: ObatFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editItem ? 'Edit Obat' : 'Tambah Obat Baru'}</DialogTitle>
          <DialogDescription>
            {editItem ? 'Perbarui informasi obat.' : 'Isi detail obat yang ingin dicatat untuk arsip kesehatan.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Obat *</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="cth: Paracetamol"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tipe/Kategori</label>
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              >
                {OBAT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Dosis</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(event) => setForm({ ...form, dosage: event.target.value })}
                placeholder="cth: 500mg"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Kegunaan / Indikasi</label>
            <input
              type="text"
              value={form.usage_info}
              onChange={(event) => setForm({ ...form, usage_info: event.target.value })}
              placeholder="cth: Demam, sakit kepala"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Frekuensi Penggunaan</label>
            <input
              type="text"
              value={form.frequency}
              onChange={(event) => setForm({ ...form, frequency: event.target.value })}
              placeholder="cth: 3x sehari"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Efek Samping</label>
            <input
              type="text"
              value={form.side_effects}
              onChange={(event) => setForm({ ...form, side_effects: event.target.value })}
              placeholder="cth: Dapat menyebabkan kantuk"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Catatan Tambahan</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Catatan penting tentang obat ini..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isPending ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
