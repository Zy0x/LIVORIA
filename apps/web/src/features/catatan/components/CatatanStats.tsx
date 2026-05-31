import { Pin, StickyNote, Tags } from 'lucide-react';

type CatatanStatsProps = {
  total: number;
  pinned: number;
  tagged: number;
};

export function CatatanStats({ total, pinned, tagged }: CatatanStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <div className="stat-card text-center p-3 sm:p-4">
        <StickyNote className="w-5 h-5 mx-auto mb-2 text-primary" />
        <p className="text-2xl font-bold text-foreground tabular-nums">{total}</p>
        <p className="text-xs text-muted-foreground">Total Catatan</p>
      </div>
      <div className="stat-card text-center p-3 sm:p-4">
        <Pin className="w-5 h-5 mx-auto mb-2 text-warning" />
        <p className="text-2xl font-bold text-foreground tabular-nums">{pinned}</p>
        <p className="text-xs text-muted-foreground">Disematkan</p>
      </div>
      <div className="stat-card text-center p-3 sm:p-4">
        <Tags className="w-5 h-5 mx-auto mb-2 text-info" />
        <p className="text-2xl font-bold text-foreground tabular-nums">{tagged}</p>
        <p className="text-xs text-muted-foreground">Bertag</p>
      </div>
    </div>
  );
}
