-- ============================================================
-- LIVORIA: Tabel Anime
-- ============================================================

CREATE TABLE public.anime (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informasi dasar
  title             TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('on-going', 'completed', 'planned')),
  genre             TEXT DEFAULT '',
  rating            NUMERIC(3,1) DEFAULT 0,
  episodes          INTEGER DEFAULT 0,
  episodes_watched  INTEGER DEFAULT 0,
  cover_url         TEXT DEFAULT '',
  synopsis          TEXT DEFAULT '',
  notes             TEXT DEFAULT '',

  -- Season/grouping
  season            INTEGER DEFAULT 1,
  cour              TEXT DEFAULT '',
  streaming_url     TEXT DEFAULT '',
  schedule          TEXT DEFAULT '',        -- comma-separated: 'senin,rabu'
  parent_title      TEXT DEFAULT '',        -- untuk grouping multi-season

  -- Bookmark & favorit
  is_favorite       BOOLEAN DEFAULT false,
  is_bookmarked     BOOLEAN DEFAULT false,

  -- Movie fields
  is_movie          BOOLEAN DEFAULT false,
  duration_minutes  INTEGER,               -- durasi film dalam menit

  -- Watch status (terpisah dari status rilis)
  watch_status      TEXT DEFAULT 'none'
                    CHECK (watch_status IN ('none', 'want_to_watch', 'watching', 'watched')),
  watched_at        TIMESTAMPTZ,           -- timestamp saat ditandai 'watched'

  -- Extra data dari MAL/AniList
  release_year      INTEGER,
  studio            TEXT,
  mal_url           TEXT,
  anilist_url       TEXT,
  mal_id            INTEGER,
  anilist_id        INTEGER,

  -- Alternative titles (JSON string)
  -- Format: { title_english, title_romaji, title_native, title_indonesian,
  --           title_mal, title_anilist, stored_title, synonyms[] }
  alternative_titles TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anime_user_id ON public.anime(user_id);
CREATE INDEX idx_anime_status ON public.anime(status);
CREATE INDEX idx_anime_parent_title ON public.anime(parent_title);
CREATE INDEX idx_anime_watch_status ON public.anime(watch_status);
CREATE INDEX idx_anime_is_movie ON public.anime(is_movie);

ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;
