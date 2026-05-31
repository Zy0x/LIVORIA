import Breadcrumb from '@/components/Breadcrumb';
import ExportMenu from '@/components/shared/ExportMenu';
import { Plus, StickyNote } from 'lucide-react';
import { catatanImportSchema } from '../schemas/catatan.schema';
import type { CatatanItem } from '../types/catatan.types';

type CatatanHeaderProps = {
  items: CatatanItem[];
  onAdd: () => void;
  onImport: (items: Partial<CatatanItem>[]) => Promise<void>;
};

export function CatatanHeader({ items, onAdd, onImport }: CatatanHeaderProps) {
  return (
    <>
      <Breadcrumb />
      <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
        <div className="min-w-0">
          <h1 className="page-header leading-tight mb-0.5">Catatan</h1>
          <p className="page-subtitle">Arsip catatan pribadi yang bisa terhubung ke data Tagihan, Anime, Donghua, Waifu, dan Obat.</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ExportMenu
            data={items}
            filename="catatan-livoria"
            onImport={onImport}
            importSchema={catatanImportSchema}
            importLabel="Catatan"
          />
          <button
            data-add-trigger="catatan"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all min-h-[36px] sm:min-h-[40px] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" /> Tambah
          </button>
        </div>
      </div>

      <div className="notice-surface mb-6">
        <StickyNote className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="notice-title">Catatan Personal</p>
          <p className="notice-copy">Catatan tersimpan per akun dan bisa ditautkan ke data lain tanpa membuka akses lintas pengguna.</p>
        </div>
      </div>
    </>
  );
}
