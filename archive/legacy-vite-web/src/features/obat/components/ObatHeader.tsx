import Breadcrumb from '@/components/Breadcrumb';
import ExportMenu from '@/components/shared/ExportMenu';
import { Plus, ShieldAlert } from 'lucide-react';
import { obatFormSchema } from '../schemas/obat.schema';
import type { ObatItem } from '../types/obat.types';

type ObatHeaderProps = {
  obatList: ObatItem[];
  onAdd: () => void;
  onImport: (items: Partial<ObatItem>[]) => Promise<void>;
};

export function ObatHeader({ obatList, onAdd, onImport }: ObatHeaderProps) {
  return (
    <>
      <Breadcrumb />
      <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
        <div className="min-w-0">
          <h1 className="page-header leading-tight mb-0.5">List Obat 💊</h1>
          <p className="page-subtitle">Arsip obat-obatan penting beserta dosis, kegunaan, dan efek samping.</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ExportMenu
            data={obatList}
            filename="obat-livoria"
            onImport={onImport}
            importSchema={obatFormSchema.passthrough()}
            importLabel="Obat"
          />
          <button
            data-add-trigger="obat"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all min-h-[36px] sm:min-h-[40px] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" /> Tambah
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-pastel-yellow/50 border border-warning/10 mb-6">
        <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Informasi Penting</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Data obat hanya untuk catatan pribadi. Selalu konsultasikan penggunaan obat dengan dokter atau apoteker.
          </p>
        </div>
      </div>
    </>
  );
}
