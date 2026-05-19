import { Pill } from 'lucide-react';
import type { ObatItem } from '../types/obat.types';

type ObatStatsProps = {
  obatList: ObatItem[];
};

export function ObatStats({ obatList }: ObatStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
      <div className="stat-card text-center p-3 sm:p-4">
        <Pill className="w-5 h-5 text-success mx-auto mb-1" />
        <p className="text-base sm:text-lg font-bold font-display">{obatList.length}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Total Obat</p>
      </div>
      <div className="stat-card text-center p-3 sm:p-4">
        <p className="text-base sm:text-lg font-bold font-display">{new Set(obatList.map((obat) => obat.type)).size}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Kategori</p>
      </div>
      <div className="stat-card text-center p-3 sm:p-4">
        <p className="text-base sm:text-lg font-bold font-display">
          {obatList.filter((obat) => obat.frequency.includes('sehari')).length}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Rutin Harian</p>
      </div>
      <div className="stat-card text-center p-3 sm:p-4">
        <p className="text-base sm:text-lg font-bold font-display">
          {obatList.filter((obat) => obat.side_effects).length}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Efek Samping</p>
      </div>
    </div>
  );
}
