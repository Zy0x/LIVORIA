import { supabase } from './supabase';
import type { Tagihan, AnimeItem, DonghuaItem, WaifuItem, ObatItem } from './types';
import { buildUserStoragePath as buildPureUserStoragePath } from '@/shared/domain/storage';
import { tagihanRepository } from '@/features/tagihan/services/tagihan.repository';
import { historyRepository } from '@/features/tagihan/services/history.repository';
import { strukRepository } from '@/features/tagihan/services/struk.repository';

const PUBLIC_IMAGE_BUCKETS = new Set(['covers', 'waifu']);

function randomStorageSuffix(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildUserStoragePath(userId: string, folder: string, fileName: string, nestedFolder?: string): string {
  return buildPureUserStoragePath({
    userId,
    folder,
    fileName,
    nestedFolder,
    timestamp: Date.now(),
    suffix: randomStorageSuffix(),
  });
}

// Generic CRUD helpers
async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

async function insertRow<T>(table: string, row: Partial<T>): Promise<T> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from(table).insert({ ...row, user_id: user.id }).select().single();
  if (error) throw error;
  return data as T;
}

async function updateRow<T>(table: string, id: string, row: Partial<T>): Promise<T> {
  const { data, error } = await supabase.from(table).update(row).eq('id', id).select().single();
  if (error) throw error;
  return data as T;
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ============ Tagihan Service ============
export const tagihanService = {
  getAll: tagihanRepository.getAll,
  create: tagihanRepository.create,
  update: tagihanRepository.update,
  delete: tagihanRepository.delete,
  getById: tagihanRepository.getById,
};

// ============ Struk Service ============
export const strukService = {
  getByTagihan: strukRepository.getByTagihan,
  create: strukRepository.create,
  delete: strukRepository.delete,
  upload: strukRepository.upload,
};

// ============ History Service ============
export const historyService = {
  getByTagihan: historyRepository.getByTagihan,
  create: historyRepository.create,
};

// ============ Payment Logic ============
export async function recordPayment(
  tagihan: Tagihan,
  jumlah: number,
  tanggal: string,
  keterangan: string = ''
): Promise<Tagihan> {
  return tagihanRepository.recordPayment(tagihan, jumlah, tanggal, keterangan);
}

// ============ Calculation Helpers ============
export type BungaPeriode = 'tahunan' | 'bulanan' | 'harian';

export interface CalcInput {
  hargaAwal: number;
  bungaPersen: number;
  bungaPeriode: BungaPeriode;
  jangkaWaktu: number; // bulan
}

export interface CalcResult {
  totalHutang: number;
  cicilanPerBulan: number;
  keuntunganEstimasi: number;
  bungaEfektifPerBulan: number;
  bungaEfektifPerTahun: number;
  bungaEfektifPerHari: number;
}

/** Convert any interest period to monthly rate */
function toMonthlyRate(persen: number, periode: BungaPeriode): number {
  if (periode === 'bulanan') return persen;
  if (periode === 'tahunan') return persen / 12;
  // harian → ~30 days/month
  return persen * 30;
}

/** Standard forward calculation: harga awal + bunga → total */
export function calculateTagihan(hargaAwal: number, bungaPersen: number, jangkaWaktu: number, bungaPeriode: BungaPeriode = 'tahunan'): CalcResult {
  const monthlyRate = toMonthlyRate(bungaPersen, bungaPeriode);
  const totalBunga = hargaAwal * (monthlyRate / 100) * jangkaWaktu;
  const totalHutang = hargaAwal + totalBunga;
  const cicilanPerBulan = totalHutang / jangkaWaktu;
  const keuntunganEstimasi = totalBunga;
  return {
    totalHutang: Math.round(totalHutang),
    cicilanPerBulan: Math.round(cicilanPerBulan),
    keuntunganEstimasi: Math.round(keuntunganEstimasi),
    bungaEfektifPerBulan: Math.round(monthlyRate * 1000) / 1000,
    bungaEfektifPerTahun: Math.round(monthlyRate * 12 * 1000) / 1000,
    bungaEfektifPerHari: Math.round((monthlyRate / 30) * 10000) / 10000,
  };
}

/** Reverse calculation: harga awal + harga akhir → derive bunga */
export function reverseCalculateTagihan(hargaAwal: number, hargaAkhir: number, jangkaWaktu: number): CalcResult {
  if (hargaAwal <= 0 || jangkaWaktu <= 0) {
    return { totalHutang: 0, cicilanPerBulan: 0, keuntunganEstimasi: 0, bungaEfektifPerBulan: 0, bungaEfektifPerTahun: 0, bungaEfektifPerHari: 0 };
  }
  const totalBunga = hargaAkhir - hargaAwal;
  const monthlyRate = (totalBunga / (hargaAwal * jangkaWaktu)) * 100;
  const cicilanPerBulan = hargaAkhir / jangkaWaktu;
  return {
    totalHutang: Math.round(hargaAkhir),
    cicilanPerBulan: Math.round(cicilanPerBulan),
    keuntunganEstimasi: Math.round(totalBunga),
    bungaEfektifPerBulan: Math.round(monthlyRate * 1000) / 1000,
    bungaEfektifPerTahun: Math.round(monthlyRate * 12 * 1000) / 1000,
    bungaEfektifPerHari: Math.round((monthlyRate / 30) * 10000) / 10000,
  };
}

// ============ Anime ============
export const animeService = {
  getAll: () => fetchAll<AnimeItem>('anime'),
  create: (row: Partial<AnimeItem>) => insertRow<AnimeItem>('anime', row),
  update: (id: string, row: Partial<AnimeItem>) => updateRow<AnimeItem>('anime', id, row),
  delete: (id: string) => deleteRow('anime', id),
  findDuplicates: async (title: string, malId?: number | null, anilistId?: number | null): Promise<AnimeItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const query = supabase.from('anime').select('*').eq('user_id', user.id);
    
    // 1. Prioritas ID: Jika ID sama, pasti duplikat
    const idConditions: string[] = [];
    if (malId) idConditions.push(`mal_id.eq.${malId}`);
    if (anilistId) idConditions.push(`anilist_id.eq.${anilistId}`);
    
    if (idConditions.length > 0) {
      const { data, error } = await query.or(idConditions.join(','));
      if (error) throw error;
      if (data && data.length > 0) return data as AnimeItem[];
    }
    
    // 2. Jika ID tidak ada/tidak cocok, cek Judul Eksak (Case-Insensitive)
    // Gunakan eq untuk judul agar tidak mendeteksi season lain (misal "Slime" vs "Slime Season 4")
    const { data: titleData, error: titleError } = await supabase
      .from('anime')
      .select('*')
      .eq('user_id', user.id)
      .ilike('title', title.trim());
      
    if (titleError) throw titleError;
    return (titleData ?? []) as AnimeItem[];
  },
};

// ============ Donghua ============
export const donghuaService = {
  getAll: () => fetchAll<DonghuaItem>('donghua'),
  create: (row: Partial<DonghuaItem>) => insertRow<DonghuaItem>('donghua', row),
  update: (id: string, row: Partial<DonghuaItem>) => updateRow<DonghuaItem>('donghua', id, row),
  delete: (id: string) => deleteRow('donghua', id),
  findDuplicates: async (title: string, malId?: number | null, anilistId?: number | null): Promise<DonghuaItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const query = supabase.from('donghua').select('*').eq('user_id', user.id);
    
    // 1. Prioritas ID: Jika ID sama, pasti duplikat
    const idConditions: string[] = [];
    if (malId) idConditions.push(`mal_id.eq.${malId}`);
    if (anilistId) idConditions.push(`anilist_id.eq.${anilistId}`);
    
    if (idConditions.length > 0) {
      const { data, error } = await query.or(idConditions.join(','));
      if (error) throw error;
      if (data && data.length > 0) return data as DonghuaItem[];
    }
    
    // 2. Jika ID tidak ada/tidak cocok, cek Judul Eksak (Case-Insensitive)
    const { data: titleData, error: titleError } = await supabase
      .from('donghua')
      .select('*')
      .eq('user_id', user.id)
      .ilike('title', title.trim());
      
    if (titleError) throw titleError;
    return (titleData ?? []) as DonghuaItem[];
  },
};

// ============ Waifu ============
export const waifuService = {
  getAll: () => fetchAll<WaifuItem>('waifu'),
  create: (row: Partial<WaifuItem>) => insertRow<WaifuItem>('waifu', row),
  update: (id: string, row: Partial<WaifuItem>) => updateRow<WaifuItem>('waifu', id, row),
  delete: (id: string) => deleteRow('waifu', id),
};

// ============ Obat ============
export const obatService = {
  getAll: () => fetchAll<ObatItem>('obat'),
  create: (row: Partial<ObatItem>) => insertRow<ObatItem>('obat', row),
  update: (id: string, row: Partial<ObatItem>) => updateRow<ObatItem>('obat', id, row),
  delete: (id: string) => deleteRow('obat', id),
};

// ============ Image upload ============
export async function uploadImage(bucket: string, file: File, folder: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  if (!PUBLIC_IMAGE_BUCKETS.has(bucket)) throw new Error('Bucket gambar tidak valid.');
  const fileName = buildUserStoragePath(user.id, folder, file.name);
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteImage(bucket: string, path: string): Promise<void> {
  const storagePath = getStoragePathFromUrlOrPath(path, bucket);
  if (storagePath) await supabase.storage.from(bucket).remove([storagePath]);
}

function getStoragePathFromUrlOrPath(value: string, bucket: string): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    const publicPath = `/storage/v1/object/public/${bucket}/`;
    const signedPath = `/storage/v1/object/sign/${bucket}/`;
    if (url.pathname.includes(publicPath)) return decodeURIComponent(url.pathname.split(publicPath)[1] || '');
    if (url.pathname.includes(signedPath)) return decodeURIComponent(url.pathname.split(signedPath)[1] || '');
  } catch {}
  return null;
}
