import { BookmarkPlus, CheckCircle, Film, PlayCircle } from 'lucide-react';

interface DonghuaStatsValue {
  ongoing: number;
  completed: number;
  planned: number;
  movies: number;
  wantToWatch: number;
  watching: number;
  watched: number;
}

interface DonghuaStatsProps {
  stats: DonghuaStatsValue;
}

export function DonghuaStats({ stats }: DonghuaStatsProps) {
  return (
    <>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-1.5">
        Status Rilis
      </p>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {([
          { label: 'Tayang', value: stats.ongoing, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/15', border: 'border-emerald-200 dark:border-emerald-400/25', dot: 'bg-emerald-500' },
          { label: 'Selesai', value: stats.completed, color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-400/15', border: 'border-sky-200 dark:border-sky-400/25', dot: 'bg-sky-500' },
          { label: 'Akan Rilis', value: stats.planned, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-400/15', border: 'border-amber-200 dark:border-amber-400/25', dot: 'bg-amber-500' },
        ] as const).map((s) => (
          <div
            key={s.label}
            className={`donghua-stat-pill flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border ${s.bg} ${s.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className={`text-base font-bold leading-none ${s.color}`}>{s.value}</span>
            <span className={`text-[9px] font-semibold leading-tight text-center ${s.color} opacity-75`}>{s.label}</span>
          </div>
        ))}
      </div>

      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-1.5">
        Tonton &amp; Koleksi
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {([
          { label: 'Film', value: stats.movies, color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-400/15', border: 'border-violet-200 dark:border-violet-400/25', Icon: Film },
          { label: 'Mau', value: stats.wantToWatch, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-400/15', border: 'border-amber-200 dark:border-amber-400/25', Icon: BookmarkPlus },
          { label: 'Nonton', value: stats.watching, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/15', border: 'border-emerald-200 dark:border-emerald-400/25', Icon: PlayCircle },
          { label: 'Tamat', value: stats.watched, color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-400/15', border: 'border-sky-200 dark:border-sky-400/25', Icon: CheckCircle },
        ] as const).map((s) => (
          <div
            key={s.label}
            className={`donghua-stat-pill flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border ${s.bg} ${s.border}`}
          >
            <s.Icon className={`w-3 h-3 shrink-0 ${s.color}`} />
            <span className={`text-base font-bold leading-none ${s.color}`}>{s.value}</span>
            <span className={`text-[9px] font-semibold leading-tight text-center ${s.color} opacity-75`}>{s.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function DonghuaHeaderIcon() {
  return (
    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
      <Film className="w-3 h-3 text-primary" />
    </div>
  );
}
