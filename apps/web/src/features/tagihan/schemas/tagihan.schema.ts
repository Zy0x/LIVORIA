import { z } from 'zod';

export const tagihanStatusSchema = z.enum(['aktif', 'lunas', 'overdue', 'ditunda']);
export const jenisTempoSchema = z.enum(['bulanan', 'berjangka']);

export const tagihanSchema = z.object({
  debitur_nama: z.string().trim().min(1),
  debitur_kontak: z.string().optional().default(''),
  barang_nama: z.string().trim().min(1),
  harga_awal: z.number().nonnegative(),
  bunga_persen: z.number().nonnegative(),
  jangka_waktu_bulan: z.number().int().positive(),
  cicilan_per_bulan: z.number().nonnegative(),
  tanggal_mulai: z.string().min(1),
  tanggal_jatuh_tempo: z.string().optional().default(''),
  tanggal_mulai_bayar: z.string().nullable().optional(),
  status: tagihanStatusSchema.default('aktif'),
  total_dibayar: z.number().nonnegative(),
  total_hutang: z.number().nonnegative(),
  sisa_hutang: z.number().nonnegative(),
  keuntungan_estimasi: z.number(),
  denda_persen_per_hari: z.number().nonnegative(),
  catatan: z.string().optional().default(''),
  metode_pembayaran: z.string().optional().default(''),
  sumber_modal: z.enum(['modal_terpisah', 'modal_bergulir', 'dana_luar']).default('modal_terpisah'),
  jenis_tempo: jenisTempoSchema.default('bulanan'),
  tgl_bayar_tanggal: z.string().nullable().optional(),
  tgl_tempo_tanggal: z.string().nullable().optional(),
  tgl_bayar_hari: z.number().nullable().optional(),
  tgl_tempo_hari: z.number().nullable().optional(),
  kuantitas: z.string().nullable().optional(),
});

export type TagihanSchema = z.infer<typeof tagihanSchema>;

