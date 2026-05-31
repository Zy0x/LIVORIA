import type { LucideIcon } from 'lucide-react';
import { Film, Heart, LayoutDashboard, NotebookPen, Pill, Receipt, Tv } from 'lucide-react';

import { QUERY_KEYS } from '@/app/query-keys';
import { ROUTES } from '@/app/route-paths';
import {
  animeService,
  donghuaService,
  obatService,
  tagihanService,
  waifuService,
} from '@/lib/supabase-service';
import { supabaseCatatanRepository } from '@/features/catatan/services/catatan.repository';

type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export interface NavigationItem {
  to: RoutePath;
  icon: LucideIcon;
  label: string;
}

export interface PrefetchConfig {
  queryKey: readonly unknown[];
  fn: () => Promise<unknown>;
}

export const NAV_ITEMS: NavigationItem[] = [
  { to: ROUTES.HOME, icon: LayoutDashboard, label: 'Dashboard' },
  { to: ROUTES.TAGIHAN, icon: Receipt, label: 'Tagihan' },
  { to: ROUTES.ANIME, icon: Tv, label: 'Anime' },
  { to: ROUTES.DONGHUA, icon: Film, label: 'Donghua' },
  { to: ROUTES.WAIFU, icon: Heart, label: 'Waifu' },
  { to: ROUTES.OBAT, icon: Pill, label: 'Obat' },
  { to: ROUTES.CATATAN, icon: NotebookPen, label: 'Catatan' },
];

export const NAV_PREFETCH_MAP: Partial<Record<RoutePath, PrefetchConfig>> = {
  [ROUTES.HOME]: { queryKey: QUERY_KEYS.TAGIHAN, fn: tagihanService.getAll },
  [ROUTES.TAGIHAN]: { queryKey: QUERY_KEYS.TAGIHAN, fn: tagihanService.getAll },
  [ROUTES.ANIME]: { queryKey: QUERY_KEYS.ANIME, fn: animeService.getAll },
  [ROUTES.DONGHUA]: { queryKey: QUERY_KEYS.DONGHUA, fn: donghuaService.getAll },
  [ROUTES.WAIFU]: { queryKey: QUERY_KEYS.WAIFU, fn: waifuService.getAll },
  [ROUTES.OBAT]: { queryKey: QUERY_KEYS.OBAT, fn: obatService.getAll },
  [ROUTES.CATATAN]: { queryKey: QUERY_KEYS.CATATAN, fn: supabaseCatatanRepository.list },
};

export const DASHBOARD_PREFETCH_KEYS = [
  QUERY_KEYS.ANIME,
  QUERY_KEYS.DONGHUA,
  QUERY_KEYS.WAIFU,
  QUERY_KEYS.OBAT,
  QUERY_KEYS.CATATAN,
] as const;
