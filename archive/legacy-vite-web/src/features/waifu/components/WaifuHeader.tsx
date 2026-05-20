import Breadcrumb from '@/components/Breadcrumb';
import ExportMenu from '@/components/shared/ExportMenu';
import { Plus } from 'lucide-react';
import { waifuFormSchema } from '../schemas/waifu.schema';
import type { WaifuItem } from '../types/waifu.types';

type WaifuHeaderProps = {
  waifuList: WaifuItem[];
  onAdd: () => void;
  onImport: (items: Partial<WaifuItem>[]) => Promise<void>;
};

export function WaifuHeader({ waifuList, onAdd, onImport }: WaifuHeaderProps) {
  return (
    <>
      <Breadcrumb />
      <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
        <div className="min-w-0">
          <h1 className="page-header leading-tight mb-0.5">Waifu Collection 💕</h1>
          <p className="page-subtitle">Koleksi karakter waifu terbaik dari anime dan donghua.</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ExportMenu
            data={waifuList}
            filename="waifu-livoria"
            onImport={onImport}
            importSchema={waifuFormSchema.passthrough()}
            importLabel="Waifu"
          />
          <button
            data-add-trigger="waifu"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all min-h-[36px] sm:min-h-[40px] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" /> Tambah
          </button>
        </div>
      </div>
    </>
  );
}
