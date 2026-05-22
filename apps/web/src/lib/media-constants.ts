import { BookmarkPlus, PlayCircle, CheckCircle, Bookmark as BookmarkIcon, type LucideIcon } from 'lucide-react';

export const DAY_LABELS: Record<string, string> = {
  senin: 'Sen', selasa: 'Sel', rabu: 'Rab', kamis: 'Kam',
  jumat: 'Jum', sabtu: 'Sab', minggu: 'Min',
};

export const STATUS_CONFIG = {
  'on-going': {
    label: 'Tayang',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-400/15 dark:border-emerald-400/30',
    dot: 'bg-emerald-500',
  },
  'completed': {
    label: 'Selesai',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 border-sky-200 dark:bg-sky-400/15 dark:border-sky-400/30',
    dot: 'bg-sky-500',
  },
  'planned': {
    label: 'Akan Rilis',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-400/15 dark:border-amber-400/30',
    dot: 'bg-amber-500',
  },
};

export const WATCH_STATUS_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  none: {
    label: 'Belum Ditandai',
    icon: BookmarkIcon,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
  want_to_watch: {
    label: 'Mau Nonton',
    icon: BookmarkPlus,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300/50 dark:border-amber-600/40',
  },
  watching: {
    label: 'Sedang Nonton',
    icon: PlayCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300/50 dark:border-emerald-600/40',
  },
  watched: {
    label: 'Sudah Ditonton',
    icon: CheckCircle,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-300/50 dark:border-sky-600/40',
  },
};

export const GENRE_PALETTE: Record<string, string> = {
  'Action': '#ef4444', 'Adventure': '#22c55e', 'Comedy': '#f59e0b',
  'Drama': '#a855f7', 'Fantasy': '#3b82f6', 'Horror': '#dc2626',
  'Mystery': '#8b5cf6', 'Romance': '#ec4899', 'Sci-Fi': '#06b6d4',
  'Slice of Life': '#10b981', 'Isekai': '#14b8a6', 'Supernatural': '#7c3aed',
  'Martial Arts': '#f97316', 'Psychological': '#6366f1', 'School': '#0ea5e9',
  'Shounen': '#3b82f6', 'Mecha': '#64748b', 'Sports': '#f97316',
  'Cultivation': '#34d399', 'Wuxia': '#fb923c', 'Xianxia': '#a78bfa', 'Xuanhuan': '#60a5fa',
};

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
