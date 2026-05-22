import type { AnimeItem } from '@/lib/types';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';
import type { AnimeSortMode } from '../types/anime.types';

type TitleLang = 'original' | 'english' | 'romaji' | 'native' | 'indonesian';
type SortableAnimeItem = AnimeItem & { updated_at?: string | null };

function resolveAnimeTitle(
  originalTitle: string,
  alternativeTitlesJson: string | null | undefined,
  lang: TitleLang
): string {
  if (lang === 'original' || !alternativeTitlesJson) return originalTitle;

  const alt = deserializeAlternativeTitles(alternativeTitlesJson);
  if (!alt) return originalTitle;

  const fieldMap: Record<TitleLang, string | undefined> = {
    original: originalTitle,
    english: alt.title_english,
    romaji: alt.title_romaji,
    native: alt.title_native,
    indonesian: alt.title_indonesian,
  };

  const preferred = fieldMap[lang];
  if (preferred?.trim() && preferred !== alt.title_english) return preferred;
  if (lang === 'indonesian') return originalTitle;
  if (alt.title_english?.trim()) return alt.title_english;
  if (alt.title_romaji?.trim()) return alt.title_romaji;
  return originalTitle;
}

export function getNearestScheduleDay(schedule: string): number {
  if (!schedule) return 999;
  const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  const today = new Date().getDay();
  const arr = schedule.split(',').map((s) => s.trim().toLowerCase());
  let min = 999;
  for (const day of arr) {
    const idx = days.indexOf(day);
    if (idx !== -1) min = Math.min(min, (idx - today + 7) % 7);
  }
  return min;
}

export function sortAnimeItems(
  items: AnimeItem[],
  sortMode: AnimeSortMode,
  sortReverse: boolean,
  titleLang: TitleLang
): AnimeItem[] {
  let result = items;

  if (sortMode === 'rating') {
    result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  if (sortMode === 'judul_az') {
    result = [...result].sort((a, b) => {
      const titleA = resolveAnimeTitle(a.title, a.alternative_titles, titleLang);
      const titleB = resolveAnimeTitle(b.title, b.alternative_titles, titleLang);
      return titleA.localeCompare(titleB);
    });
  }

  if (sortMode === 'episode') {
    result = [...result].sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
  }

  if (sortMode === 'jadwal_terdekat') {
    result = [...result].sort((a, b) =>
      getNearestScheduleDay(a.schedule || '') - getNearestScheduleDay(b.schedule || '')
    );
  }

  if (sortMode === 'tahun_terbaru') {
    result = [...result].sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
  }

  if (sortMode === 'baru_ditonton') {
    result = [...result].sort((a, b) => {
      const aTime = (a as SortableAnimeItem).updated_at ? new Date((a as SortableAnimeItem).updated_at ?? '').getTime() : 0;
      const bTime = (b as SortableAnimeItem).updated_at ? new Date((b as SortableAnimeItem).updated_at ?? '').getTime() : 0;
      return bTime - aTime;
    });
  }

  return sortReverse ? [...result].reverse() : result;
}
