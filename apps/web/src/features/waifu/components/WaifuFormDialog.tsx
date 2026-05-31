import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import { ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SourceType, WaifuFormValues, WaifuItem, WaifuSourceTitle, WaifuTier } from '../types/waifu.types';
import { WAIFU_TIER_COLORS, WAIFU_TIERS } from '../types/waifu.types';
import { WaifuSourceSelect } from './WaifuSourceSelect';

type WaifuFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: WaifuItem | null;
  form: WaifuFormValues;
  setForm: Dispatch<SetStateAction<WaifuFormValues>>;
  imageInputRef: RefObject<HTMLInputElement>;
  imagePreview: string;
  setImagePreview: Dispatch<SetStateAction<string>>;
  setImageFile: Dispatch<SetStateAction<File | null>>;
  sourceSearch: string;
  setSourceSearch: Dispatch<SetStateAction<string>>;
  showSourceDropdown: boolean;
  setShowSourceDropdown: Dispatch<SetStateAction<boolean>>;
  filteredSources: WaifuSourceTitle[];
  isPending: boolean;
  isUploading: boolean;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';

export function WaifuFormDialog({
  open,
  onOpenChange,
  editItem,
  form,
  setForm,
  imageInputRef,
  imagePreview,
  setImagePreview,
  setImageFile,
  sourceSearch,
  setSourceSearch,
  showSourceDropdown,
  setShowSourceDropdown,
  filteredSources,
  isPending,
  isUploading,
  onImageSelect,
  onSubmit,
}: WaifuFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[56rem] sm:max-w-3xl max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editItem ? 'Edit Waifu' : 'Tambah Waifu Baru'}</DialogTitle>
          <DialogDescription>
            {editItem ? 'Perbarui informasi waifu.' : 'Tambahkan karakter waifu baru ke koleksimu.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <label className="label-text mb-1.5 block">Gambar Waifu</label>
            <div className="flex items-center gap-3">
              <div
                className="w-20 h-[120px] rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border shrink-0 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => imageInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Waifu" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                    <span className="text-[9px] text-muted-foreground">Upload</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <button type="button" onClick={() => imageInputRef.current?.click()} className="text-sm text-primary font-medium hover:underline">
                  {imagePreview ? 'Ganti Gambar' : 'Upload Gambar'}
                </button>
                <p className="helper-text">Format potrait 2:3 · Max 5MB</p>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                      setForm({ ...form, image_url: '' });
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Hapus gambar
                  </button>
                )}
              </div>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelect} />
          </div>

          <div>
            <label className="label-text mb-1.5 block">Nama Waifu *</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="cth: Frieren, Yor Forger"
              className={inputClass}
              required
            />
          </div>

          <WaifuSourceSelect
            form={form}
            setForm={setForm}
            sourceSearch={sourceSearch}
            setSourceSearch={setSourceSearch}
            showSourceDropdown={showSourceDropdown}
            setShowSourceDropdown={setShowSourceDropdown}
            filteredSources={filteredSources}
            inputClass={inputClass}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Tipe Sumber</label>
              <select
                value={form.source_type}
                onChange={(event) => setForm({ ...form, source_type: event.target.value as SourceType })}
                className={inputClass}
              >
                <option value="anime">Anime</option>
                <option value="donghua">Donghua</option>
              </select>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Tier</label>
              <select
                value={form.tier}
                onChange={(event) => setForm({ ...form, tier: event.target.value as WaifuTier })}
                className={inputClass}
              >
                <option value="S">S — Best of the Best</option>
                <option value="A">A — Sangat Bagus</option>
                <option value="B">B — Bagus</option>
                <option value="C">C — Biasa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-text mb-2 block">Pilih Tier</label>
            <div className="grid grid-cols-4 gap-2">
              {WAIFU_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setForm({ ...form, tier })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${form.tier === tier ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'}`}
                >
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-lg ${WAIFU_TIER_COLORS[tier]}`}>
                    {tier}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">
                    {tier === 'S' ? 'Terbaik' : tier === 'A' ? 'Sangat Bagus' : tier === 'B' ? 'Bagus' : 'Biasa'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-text mb-1.5 block">Catatan</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Kenapa karakter ini jadi waifu favorit?"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {isUploading ? 'Mengupload...' : isPending ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
