import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { CheckCircle2, ChevronDown, Link2, LockKeyhole, PencilLine, RotateCcw, Search, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCatatanEditorDraft } from '../hooks/useCatatanEditorDraft';
import type { CatatanFormValues, CatatanItem, CatatanRelatedOption } from '../types/catatan.types';
import { CATATAN_COLORS, CATATAN_RELATED_TYPE_LABELS } from '../types/catatan.types';
import { CatatanRelatedPickerDialog } from './CatatanRelatedPickerDialog';
import { CatatanRichEditor } from './CatatanRichEditor';

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
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [detailsUnlocked, setDetailsUnlocked] = useState(false);
  const {
    draftStatus,
    hasUnsavedChanges,
    pendingDraft,
    restoreDraft,
    dismissDraft,
    clearDraft,
  } = useCatatanEditorDraft({ open, editItem, form, setForm });
  const draftKey = editItem?.id ? `edit:${editItem.id}` : 'new';
  const detailsLocked = !detailsUnlocked;

  useEffect(() => {
    if (open) setDetailsUnlocked(false);
  }, [editItem?.id, open]);

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

  const requestOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && hasUnsavedChanges && !isPending) {
      setCloseConfirmOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  const closeWithDraft = () => {
    setCloseConfirmOpen(false);
    onOpenChange(false);
  };

  const discardAndClose = async () => {
    await clearDraft();
    setCloseConfirmOpen(false);
    onOpenChange(false);
  };

  const autosaveLabel =
    draftStatus === 'saved-cloud'
      ? 'Draft tersinkron'
      : draftStatus === 'saved-local'
        ? 'Draft tersimpan lokal'
        : draftStatus === 'saving'
          ? 'Menyimpan draft...'
          : draftStatus === 'error'
            ? 'Draft cloud tertunda'
            : 'Autosave aktif';

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent
        className="max-w-[min(72rem,calc(100vw-1rem))] sm:max-w-5xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display pr-7">{editItem ? 'Edit Catatan' : 'Tambah Catatan'}</DialogTitle>
          <DialogDescription>
            Simpan catatan singkat, ide, atau informasi personal yang ingin mudah ditemukan.
          </DialogDescription>
        </DialogHeader>
        {pendingDraft && (
          <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-bold text-foreground">Draft belum tersimpan ditemukan</p>
              <p className="text-xs text-muted-foreground">
                Sumber: {pendingDraft.source === 'cloud' ? 'Cloud' : 'Lokal'} · {new Date(pendingDraft.updated_at).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
              </button>
              <button
                type="button"
                onClick={dismissDraft}
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Abaikan
              </button>
            </div>
          </div>
        )}
        <form onSubmit={onSubmit} className="min-w-0 space-y-4 mt-2">
          <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Detail Catatan</p>
                <p className="text-xs text-muted-foreground">
                  {detailsLocked
                    ? 'Judul, tag, warna, sematan, dan koneksi data dikunci agar tidak berubah tanpa sengaja.'
                    : 'Detail sedang terbuka. Kunci kembali setelah selesai mengubah metadata.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsUnlocked((value) => !value)}
                className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-all hover:bg-accent"
              >
                {detailsLocked ? <PencilLine className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                {detailsLocked ? 'Edit Detail' : 'Kunci Detail'}
              </button>
            </div>

            <label className="text-sm font-medium text-foreground mb-1.5 block">Judul *</label>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="cth: Ide fitur berikutnya"
              readOnly={detailsLocked}
              aria-readonly={detailsLocked}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all read-only:cursor-default read-only:bg-muted/30 read-only:text-muted-foreground"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Isi Catatan</label>
            <CatatanRichEditor
              value={form.content_doc}
              draftKey={draftKey}
              catatanId={editItem?.id ?? null}
              autosaveLabel={autosaveLabel}
              autosaveStatus={draftStatus}
              onChange={(contentDoc, plainText) => setForm({ ...form, content: plainText, content_doc: contentDoc })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tag</label>
              <input
                value={form.tagsText}
                onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
                placeholder="kerja, ide, pribadi"
                readOnly={detailsLocked}
                aria-readonly={detailsLocked}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all read-only:cursor-default read-only:bg-muted/30 read-only:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Warna</label>
              <div className="relative">
                <select
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value as CatatanFormValues['color'] })}
                  disabled={detailsLocked}
                  className="w-full appearance-none px-3 py-2.5 pr-12 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all disabled:cursor-default disabled:bg-muted/30 disabled:text-muted-foreground disabled:opacity-100"
                >
                  {CATATAN_COLORS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                  <ChevronDown className="h-4 w-4" />
                </span>
              </div>
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
                  disabled={detailsLocked || relatedOptionsLoading}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {detailsLocked ? 'Buka Kunci Detail' : selectedRelatedOption ? 'Ubah Data Terkait' : relatedOptionsLoading ? 'Memuat Data...' : 'Pilih Data Terkait'}
                </button>
                {selectedRelatedOption && (
                  <button
                    type="button"
                    onClick={() => handleRelatedSelect(null)}
                    disabled={detailsLocked}
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
              disabled={detailsLocked}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Sematkan catatan ini di bagian atas.
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => requestOpenChange(false)}
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
        <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Draft catatan sudah diamankan</AlertDialogTitle>
              <AlertDialogDescription>
                Perubahanmu sudah disimpan sebagai draft. Kamu bisa menutup modal dan memulihkannya nanti, atau membuang draft ini.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={discardAndClose}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Buang Draft
              </AlertDialogAction>
              <AlertDialogAction type="button" onClick={closeWithDraft}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Tutup & Simpan Draft
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
