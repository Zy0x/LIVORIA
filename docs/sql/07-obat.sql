-- ============================================================
-- LIVORIA: Tabel Obat (Catatan Obat-obatan)
-- ============================================================

CREATE TABLE public.obat (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name          TEXT NOT NULL DEFAULT '',
  type          TEXT DEFAULT '',              -- jenis obat (tablet, kapsul, sirup, dll)
  dosage        TEXT DEFAULT '',              -- dosis (cth: 500mg)
  usage_info    TEXT DEFAULT '',              -- aturan pakai
  notes         TEXT DEFAULT '',
  frequency     TEXT DEFAULT '',              -- frekuensi minum (cth: 3x sehari)
  side_effects  TEXT DEFAULT '',              -- efek samping

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_obat_user_id ON public.obat(user_id);

ALTER TABLE public.obat ENABLE ROW LEVEL SECURITY;
