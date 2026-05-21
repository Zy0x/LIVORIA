import { Clock, Film, Heart, Pill, Receipt, Settings, Tv } from 'lucide-react';
import { formatCompactIDR, formatCurrencyIDR } from '@/shared/formatters/currency';
export interface TableStat { name: string; label: string; icon: any; count: number; color: string; bg: string }

export const TABLE_CONFIG_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  'anime':            { label: 'Anime',           icon: Tv,      color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-400/15' },
  'donghua':          { label: 'Donghua',         icon: Film,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/15' },
  'waifu':            { label: 'Waifu',           icon: Heart,   color: 'text-pink-600 dark:text-pink-400',      bg: 'bg-pink-50 dark:bg-pink-400/15' },
  'obat':             { label: 'Obat',            icon: Pill,    color: 'text-sky-600 dark:text-sky-400',        bg: 'bg-sky-50 dark:bg-sky-400/15' },
  'tagihan':          { label: 'Tagihan',         icon: Receipt, color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-400/15' },
  'tagihan_history':  { label: 'Riwayat Bayar',   icon: Clock,   color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-400/15' },
  'struk':            { label: 'Struk',           icon: Receipt, color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-400/15' },
  'user_preferences': { label: 'Preferensi',      icon: Settings, color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-50 dark:bg-slate-400/15' },
};

export const fmt = formatCurrencyIDR;
export const fmtShort = formatCompactIDR;

export { getAdminSession } from './services/admin.service';

export type AdminTab = 'database' | 'backup' | 'users';
