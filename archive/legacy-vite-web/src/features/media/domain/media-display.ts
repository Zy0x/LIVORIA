export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export function formatDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export const DAY_LABELS: Record<string, string> = {
  senin: 'Sen',
  selasa: 'Sel',
  rabu: 'Rab',
  kamis: 'Kam',
  jumat: 'Jum',
  sabtu: 'Sab',
  minggu: 'Min',
};

export const STATUS_CONFIG = {
  'on-going': {
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-400/15 dark:border-emerald-400/30',
    color: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Tayang',
  },
  completed: {
    bg: 'bg-sky-50 border-sky-200 dark:bg-sky-400/15 dark:border-sky-400/30',
    color: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    label: 'Selesai',
  },
  planned: {
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-400/15 dark:border-amber-400/30',
    color: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    label: 'Akan Rilis',
  },
} as const;

export const GENRE_PALETTE: Record<string, string> = {
  Action: '#ef4444',
  Adventure: '#22c55e',
  Comedy: '#f59e0b',
  Drama: '#a855f7',
  Fantasy: '#3b82f6',
  Horror: '#dc2626',
  Isekai: '#14b8a6',
  'Martial Arts': '#f97316',
  Mecha: '#64748b',
  Mystery: '#8b5cf6',
  Psychological: '#6366f1',
  Romance: '#ec4899',
  School: '#0ea5e9',
  'Sci-Fi': '#06b6d4',
  Shounen: '#3b82f6',
  'Slice of Life': '#10b981',
  Sports: '#f97316',
  Supernatural: '#7c3aed',
};
