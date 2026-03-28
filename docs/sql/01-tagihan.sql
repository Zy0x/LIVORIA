-- ============================================================
-- LIVORIA: Tabel Tagihan (Hutang/Piutang)
-- ============================================================

CREATE TYPE public.tagihan_status AS ENUM ('aktif', 'lunas', 'overdue', 'ditunda');
CREATE TYPE public.jenis_tempo AS ENUM ('bulanan', 'berjangka');
CREATE TYPE public.sumber_modal_type AS ENUM ('modal_terpisah', 'modal_bergulir');

CREATE TABLE public.tagihan (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informasi debitur
  debitur_nama          TEXT NOT NULL DEFAULT '',
  debitur_kontak        TEXT DEFAULT '',

  -- Informasi barang/pinjaman
  barang_nama           TEXT NOT NULL DEFAULT '',
  harga_awal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  bunga_persen          NUMERIC(8,4) NOT NULL DEFAULT 0,
  jangka_waktu_bulan    INTEGER NOT NULL DEFAULT 1,
  cicilan_per_bulan     NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Tanggal
  tanggal_mulai         DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_jatuh_tempo   DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_mulai_bayar   DATE,

  -- Status & pembayaran
  status                tagihan_status NOT NULL DEFAULT 'aktif',
  total_dibayar         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_hutang          NUMERIC(15,2) NOT NULL DEFAULT 0,
  sisa_hutang           NUMERIC(15,2) NOT NULL DEFAULT 0,
  keuntungan_estimasi   NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Denda & catatan
  denda_persen_per_hari NUMERIC(8,4) NOT NULL DEFAULT 0,
  catatan               TEXT DEFAULT '',
  metode_pembayaran     TEXT DEFAULT '',

  -- Modal & tempo
  sumber_modal          sumber_modal_type DEFAULT 'modal_terpisah',
  jenis_tempo           jenis_tempo DEFAULT 'bulanan',

  -- Tanggal bayar/tempo spesifik
  tgl_bayar_tanggal     TEXT,
  tgl_tempo_tanggal     TEXT,
  tgl_bayar_hari        INTEGER,
  tgl_tempo_hari        INTEGER,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index untuk query performa
CREATE INDEX idx_tagihan_user_id ON public.tagihan(user_id);
CREATE INDEX idx_tagihan_status ON public.tagihan(status);
CREATE INDEX idx_tagihan_tanggal_jatuh_tempo ON public.tagihan(tanggal_jatuh_tempo);

-- RLS
ALTER TABLE public.tagihan ENABLE ROW LEVEL SECURITY;
