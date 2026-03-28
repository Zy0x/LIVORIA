-- ============================================================
-- LIVORIA: Tabel Tagihan History (Riwayat Pembayaran)
-- ============================================================

CREATE TABLE public.tagihan_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_id  UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  aksi        TEXT NOT NULL DEFAULT '',     -- 'pembayaran', 'denda', 'perubahan_status', dll
  detail      TEXT DEFAULT '',              -- Deskripsi detail aksi
  jumlah      NUMERIC(15,2) DEFAULT 0,     -- Jumlah uang terkait aksi

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tagihan_history_tagihan_id ON public.tagihan_history(tagihan_id);
CREATE INDEX idx_tagihan_history_user_id ON public.tagihan_history(user_id);

ALTER TABLE public.tagihan_history ENABLE ROW LEVEL SECURITY;
