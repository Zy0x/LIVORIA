-- ============================================================
-- LIVORIA: Tabel Waifu (Tier List Karakter)
-- ============================================================

CREATE TABLE public.waifu (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name        TEXT NOT NULL DEFAULT '',
  source      TEXT DEFAULT '',              -- judul anime/donghua asal
  source_type TEXT DEFAULT 'anime'
              CHECK (source_type IN ('anime', 'donghua')),
  tier        TEXT DEFAULT 'B'
              CHECK (tier IN ('S', 'A', 'B', 'C')),
  image_url   TEXT DEFAULT '',
  notes       TEXT DEFAULT '',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waifu_user_id ON public.waifu(user_id);
CREATE INDEX idx_waifu_tier ON public.waifu(tier);

ALTER TABLE public.waifu ENABLE ROW LEVEL SECURITY;
