export type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';
export type MediaStatus = 'on-going' | 'completed' | 'planned';

export interface GroupableMediaItem {
  id: string;
  title: string;
  parent_title?: string | null;
  season?: number;
  cour?: string | null;
  is_movie?: boolean;
  release_year?: number | null;
  [key: string]: unknown;
}
