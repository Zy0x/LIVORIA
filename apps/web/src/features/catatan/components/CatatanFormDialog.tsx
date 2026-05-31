import { useMemo, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Link2, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CatatanFormValues, CatatanItem, CatatanRelatedOption } from '../types/catatan.types';
import { CATATAN_COLORS, CATATAN_RELATED_TYPE_LABELS } from '../types/catatan.types';
import { CatatanRelatedPickerDialog } from './CatatanRelatedPickerDialog';

type CatatanFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: CatatanItem | null;
  form: CatatanFormValues;
  setForm: Dispatch<SetStateAction<CatatanFormValues>>;
  relatedOptions: CatatanRelatedOption[];
  relatedOptionsLoading: boolean;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CatatanFormDialog({
  open,
  onOpenChange,
  editItem,
  form,
  setForm,
  relatedOptions,
  relatedOptionsLoading,
  isPending,
  onSubmit,
}: CatatanFormDialogProps) {
  const [relatedPickerOpen, setRelatedPickerOpen] = useState(false);

  const selectedRelatedOption = useMemo((): CatatanRelatedOption | null => {
    if (form.related_type === 'none' || !form.related_id) return null;

    const selected = relatedOptions.find((option) => option.type === form.related_type && option.id === form.related_id);
    if (selected) return selected;

    if (editItem?.related_type === form.related_type && editItem.related_id === form.related_id) {
      return {
        type: editItem.related_type,
        id: editItem.related_id,
        title: editItem.related_title || 'Data terkait saat ini',
        subtitle: CATATAN_RELATED_TYPE_LABELS[editItem.related_type],
        route: '',
        searchText: editItem.related_title || '',
      };
    }

    return null;
  }, [editItem, form.related_id, form.related_type, relatedOptions]);

  const handleRelatedSelect = (option: CatatanRelatedOption | null) => {
    setForm((current) => ({
      ...current,
      related_type: option?.type ?? 'none',
      related_id: option?.id ?? '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[56rem] sm:max-w-3xl">
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

          <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-foreground">Hubungkan ke Data</p>
              <p className="text-xs text-muted-foreground">
                Opsional. Catatan bisa ditautkan ke Tagihan, Anime, Donghua, Waifu, atau Obat milik akun ini.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              {selectedRelatedOption ? (
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {CATATAN_RELATED_TYPE_LABELS[selectedRelatedOption.type]}
                    </span>
                    <p className="break-words text-sm font-bold leading-snug text-foreground">
                      {selectedRelatedOption.title}
                    </p>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">
                      {selectedRelatedOption.subtitle}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <X className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">Tanpa koneksi</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Catatan ini belum ditautkan ke data lain.
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setRelatedPickerOpen(true)}
                  disabled={relatedOptionsLoading}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {selectedRelatedOption ? 'Ubah Data Terkait' : relatedOptionsLoading ? 'Memuat Data...' : 'Pilih Data Terkait'}
                </button>
                {selectedRelatedOption && (
                  <button
                    type="button"
                    onClick={() => handleRelatedSelect(null)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    Lepas Koneksi
                  </button>
                )}
              </div>
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
        <CatatanRelatedPickerDialog
          open={relatedPickerOpen}
          onOpenChange={setRelatedPickerOpen}
          options={relatedOptions}
          selectedOption={selectedRelatedOption}
          loading={relatedOptionsLoading}
          onSelect={handleRelatedSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
