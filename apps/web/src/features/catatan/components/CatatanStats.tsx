import { Link2, Pin, StickyNote, Tags } from 'lucide-react';

type CatatanStatsProps = {
  total: number;
  pinned: number;
  tagged: number;
  linked: number;
};

export function CatatanStats({ total, pinned, tagged, linked }: CatatanStatsProps) {
  const cardClass =
    'stat-card flex min-h-[92px] flex-col items-center justify-center text-center p-2.5 sm:min-h-[118px] sm:p-4';
  const iconClass = 'w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1.5 sm:mb-2';
  const valueClass = 'text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none';
  const labelClass = 'mt-1 text-[11px] sm:text-xs text-muted-foreground leading-tight';

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 mb-5 sm:mb-6">
      <div className={cardClass}>
        <StickyNote className={`${iconClass} text-primary`} />
        <p className={valueClass}>{total}</p>
        <p className={labelClass}>Total Catatan</p>
      </div>
      <div className={cardClass}>
        <Pin className={`${iconClass} text-warning`} />
        <p className={valueClass}>{pinned}</p>
        <p className={labelClass}>Disematkan</p>
      </div>
      <div className={cardClass}>
        <Tags className={`${iconClass} text-info`} />
        <p className={valueClass}>{tagged}</p>
        <p className={labelClass}>Bertag</p>
      </div>
      <div className={cardClass}>
        <Link2 className={`${iconClass} text-success`} />
        <p className={valueClass}>{linked}</p>
        <p className={labelClass}>Terhubung</p>
      </div>
    </div>
  );
}
