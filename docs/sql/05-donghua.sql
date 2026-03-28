-- ============================================================
-- LIVORIA: Tabel Donghua
-- Struktur identik dengan anime, dipisah untuk organisasi
-- ============================================================

CREATE TABLE public.donghua (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

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

  season            INTEGER DEFAULT 1,
  cour              TEXT DEFAULT '',
  streaming_url     TEXT DEFAULT '',
  schedule          TEXT DEFAULT '',
  parent_title      TEXT DEFAULT '',

  is_favorite       BOOLEAN DEFAULT false,
  is_bookmarked     BOOLEAN DEFAULT false,

  is_movie          BOOLEAN DEFAULT false,
  duration_minutes  INTEGER,

  watch_status      TEXT DEFAULT 'none'
                    CHECK (watch_status IN ('none', 'want_to_watch', 'watching', 'watched')),
  watched_at        TIMESTAMPTZ,

  release_year      INTEGER,
  studio            TEXT,
  mal_url           TEXT,
  anilist_url       TEXT,
  mal_id            INTEGER,
  anilist_id        INTEGER,
  alternative_titles TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donghua_user_id ON public.donghua(user_id);
CREATE INDEX idx_donghua_status ON public.donghua(status);
CREATE INDEX idx_donghua_parent_title ON public.donghua(parent_title);
CREATE INDEX idx_donghua_watch_status ON public.donghua(watch_status);

ALTER TABLE public.donghua ENABLE ROW LEVEL SECURITY;
