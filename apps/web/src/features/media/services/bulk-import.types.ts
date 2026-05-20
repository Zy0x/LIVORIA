export interface BulkItem {
  title: string;
  /** Judul asli yang dimasukkan user sebelum auto-fill */
  originalTitle?: string;
  season: number;
  cour: string;
  rating: number;
  note: string;
  status: 'on-going' | 'completed' | 'planned';
  is_favorite: boolean;
  is_bookmarked: boolean;
  is_movie: boolean;
  is_hentai?: boolean;
  genre?: string;
  parent_title?: string;
  cover_url?: string;
  synopsis?: string;
  studio?: string;
  release_year?: number | null;
  episodes?: number;
  episodes_watched?: number;
  mal_id?: number | null;
  anilist_id?: number | null;
  mal_url?: string;
  anilist_url?: string;
  duration_minutes?: number | null;
  alternative_titles?: string | null;
  streaming_url?: string;
  schedule?: string;
  watch_status?: 'none' | 'want_to_watch' | 'watching' | 'watched';
  watched_at?: string | null;
  enriched?: boolean;
  enrichSource?: string;
  matchConfidence?: 'high' | 'medium' | 'low' | 'none';
  matchScore?: number;
  candidates?: SearchCandidate[];
  _synopsisTranslated?: boolean;
  reviewed?: boolean;
}

export interface SearchCandidate {
  mal_id?: number | null;
  anilist_id?: number | null;
  title: string;
  title_english?: string;
  title_native?: string;
  cover_url?: string;
  year?: number | null;
  episodes?: number | null;
  score?: number | null;
  is_movie?: boolean;
  source: 'anilist' | 'jikan';
  similarity: number;
  detectedSeason?: number | null;
  _al?: any;
  _jk?: any;
}

