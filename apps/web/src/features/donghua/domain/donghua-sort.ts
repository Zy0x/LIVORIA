import type { DonghuaItem } from '@/lib/types';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';
import { chainComparators, compareDateDesc, compareNumberAsc, compareNumberDesc, compareTextAsc, toSortableTime } from '@/shared/domain/sort-utils';
import type { DonghuaSortMode } from '../types/donghua.types';

type TitleLang = 'original' | 'english' | 'romaji' | 'native' | 'indonesian';

function resolveDonghuaTitle(
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

export function sortDonghuaItems(
  items: DonghuaItem[],
  sortMode: DonghuaSortMode,
  sortReverse: boolean,
  titleLang: TitleLang,
  groupMap?: Record<string, DonghuaItem[]>,
): DonghuaItem[] {
  const groupItems = (item: DonghuaItem) => groupMap?.[item.id] ?? [item];
  const maxGroupCreatedAt = (item: DonghuaItem) => Math.max(...groupItems(item).map((groupItem) => toSortableTime(groupItem.created_at)));
  const maxGroupWatchedAt = (item: DonghuaItem) => Math.max(...groupItems(item).map((groupItem) => toSortableTime(groupItem.watched_at)));
  const maxGroupReleaseYear = (item: DonghuaItem) => Math.max(...groupItems(item).map((groupItem) => groupItem.release_year ?? 0));
  const byTitle = (a: DonghuaItem, b: DonghuaItem) =>
    compareTextAsc(
      resolveDonghuaTitle(a.title, a.alternative_titles, titleLang),
      resolveDonghuaTitle(b.title, b.alternative_titles, titleLang),
    );

  const byCreatedDesc = (a: DonghuaItem, b: DonghuaItem) => compareDateDesc(a.created_at, b.created_at);
  const byGroupCreatedDesc = (a: DonghuaItem, b: DonghuaItem) => maxGroupCreatedAt(b) - maxGroupCreatedAt(a);
  let result = [...items];

  switch (sortMode) {
    case 'rating':
      result.sort(chainComparators((a, b) => compareNumberDesc(a.rating, b.rating), byCreatedDesc, byTitle));
      break;
    case 'judul_az':
      result.sort(chainComparators(byTitle, byCreatedDesc));
      break;
    case 'episode':
      result.sort(chainComparators((a, b) => compareNumberDesc(a.episodes, b.episodes), byCreatedDesc, byTitle));
      break;
    case 'jadwal_terdekat':
      result.sort(chainComparators((a, b) => compareNumberAsc(getNearestScheduleDay(a.schedule || ''), getNearestScheduleDay(b.schedule || '')), byTitle, byCreatedDesc));
      break;
    case 'tahun_terbaru':
      result.sort(chainComparators((a, b) => compareNumberDesc(maxGroupReleaseYear(a), maxGroupReleaseYear(b)), byGroupCreatedDesc, byTitle));
      break;
    case 'baru_ditonton':
      result.sort(chainComparators((a, b) => compareNumberDesc(maxGroupWatchedAt(a), maxGroupWatchedAt(b)), byGroupCreatedDesc, byTitle));
      break;
    case 'terbaru':
    default:
      result.sort(chainComparators(byGroupCreatedDesc, byTitle));
      break;
  }

  return sortReverse ? [...result].reverse() : result;
}
