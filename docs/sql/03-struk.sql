-- ============================================================
-- LIVORIA: Tabel Struk (Bukti Pembayaran)
-- ============================================================

CREATE TABLE public.struk (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_id  UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  file_url    TEXT NOT NULL DEFAULT '',
  file_name   TEXT NOT NULL DEFAULT '',
  file_type   TEXT DEFAULT '',
  keterangan  TEXT DEFAULT '',

  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_struk_tagihan_id ON public.struk(tagihan_id);

ALTER TABLE public.struk ENABLE ROW LEVEL SECURITY;
