import Breadcrumb from '@/components/Breadcrumb';
import { Plus } from 'lucide-react';

import type { Tagihan } from '../types/tagihan.types';
import TagihanExport from './TagihanExport';

interface TagihanHeaderProps {
  data: Tagihan[];
  onImportDone: () => void;
  onAdd: () => void;
}

export default function TagihanHeader({ data, onImportDone, onAdd }: TagihanHeaderProps) {
  return (
    <>
      <Breadcrumb />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Manajemen Tagihan</h1>
          <p className="page-subtitle mt-1">
            Tracking pinjaman, cicilan, dan pembayaran debitur secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <TagihanExport data={data} onImportDone={onImportDone} />
          <button
            data-add-trigger="tagihan"
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>
    </>
  );
}
