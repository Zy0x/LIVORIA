-- ============================================================
-- LIVORIA: Tambah kolom is_hentai ke tabel anime dan donghua
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================================

ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS is_hentai BOOLEAN DEFAULT false;
ALTER TABLE public.donghua ADD COLUMN IF NOT EXISTS is_hentai BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_anime_is_hentai ON public.anime(is_hentai);
CREATE INDEX IF NOT EXISTS idx_donghua_is_hentai ON public.donghua(is_hentai);
