import type { AlternativeTitles } from '@/hooks/useAlternativeTitles';

export interface AnimeExtraData {
  release_year?: number | null;
  studio?: string;
  mal_url?: string;
  anilist_url?: string;
  episodes?: number | null;
  genres_from_search?: string;
  synopsis_id?: string;
  mal_id?: number | null;
  anilist_id?: number | null;
  /** JSON string dari AlternativeTitles — semua variasi nama */
  alternative_titles?: string | null;
}

export interface AnimeExtraFieldsProps {
  value: AnimeExtraData;
  onChange: (data: AnimeExtraData) => void;
  titleHint?: string;
  hasCoverOverride?: boolean;
  onTitleChange?: (title: string) => void;
  onCoverUrlChange?: (url: string) => void;
  onGenresChange?: (genres: string[]) => void;
  onEpisodesChange?: (eps: number) => void;
  onSynopsisChange?: (synopsis: string) => void;
  onStatusChange?: (status: 'on-going' | 'completed' | 'planned') => void;
  onSeasonChange?: (season: number) => void;
  onCourChange?: (cour: string) => void;
  onParentTitleChange?: (parentTitle: string) => void;
  onRatingChange?: (rating: number) => void;
  onIsMovieChange?: (isMovie: boolean) => void;
  onDurationMinutesChange?: (minutes: number | null) => void;
  /** NEW: Callback saat alternative titles berhasil di-fetch */
  onAlternativeTitlesChange?: (titles: AlternativeTitles) => void;
  /** NEW: Callback saat status loading/busy berubah */
  onBusyChange?: (isBusy: boolean) => void;
  /** NEW: Callback saat status translating berubah */
  onTranslatingChange?: (isTranslating: boolean) => void;
  /** NEW: Callback saat ada error translasi */
  onTranslationErrorChange?: (error: string | null) => void;
  /** Tipe media untuk menentukan bahasa pencarian */
  mediaType?: 'anime' | 'donghua';
}
