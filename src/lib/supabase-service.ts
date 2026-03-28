import { supabase } from './supabase';
import type { Tagihan, Struk, TagihanHistory, AnimeItem, DonghuaItem, WaifuItem, ObatItem } from './types';

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
  getAll: () => fetchAll<Tagihan>('tagihan'),
  create: (row: Partial<Tagihan>) => insertRow<Tagihan>('tagihan', row),
  update: (id: string, row: Partial<Tagihan>) => updateRow<Tagihan>('tagihan', id, row),
  delete: (id: string) => deleteRow('tagihan', id),
  getById: async (id: string): Promise<Tagihan> => {
    const { data, error } = await supabase.from('tagihan').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Tagihan;
  },
};

// ============ Struk Service ============
export const strukService = {
  getByTagihan: async (tagihanId: string): Promise<Struk[]> => {
    const { data, error } = await supabase.from('struk').select('*').eq('tagihan_id', tagihanId).order('uploaded_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Struk[];
  },
  create: (row: Partial<Struk>) => insertRow<Struk>('struk', row),
  delete: async (id: string) => {
    const { data } = await supabase.from('struk').select('file_url').eq('id', id).single();
    if (data?.file_url) {
      try {
        const url = new URL(data.file_url);
        const storagePath = url.pathname.split('/storage/v1/object/public/struk/')[1];
        if (storagePath) await supabase.storage.from('struk').remove([storagePath]);
      } catch {}
    }
    await deleteRow('struk', id);
  },
  upload: async (file: File, tagihanId: string, keterangan: string = ''): Promise<Struk> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${tagihanId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('struk').upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('struk').getPublicUrl(fileName);
    return insertRow<Struk>('struk', {
      tagihan_id: tagihanId,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      keterangan,
    });
  },
};

// ============ History Service ============
export const historyService = {
  getByTagihan: async (tagihanId: string): Promise<TagihanHistory[]> => {
    const { data, error } = await supabase.from('tagihan_history').select('*').eq('tagihan_id', tagihanId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TagihanHistory[];
  },
  create: (row: Partial<TagihanHistory>) => insertRow<TagihanHistory>('tagihan_history', row),
};

// ============ Payment Logic ============
export async function recordPayment(
  tagihan: Tagihan,
  jumlah: number,
  tanggal: string,
  keterangan: string = ''
): Promise<Tagihan> {
  const newTotalDibayar = Number(tagihan.total_dibayar) + jumlah;
  const newSisaHutang = Number(tagihan.total_hutang) - newTotalDibayar;
  const newStatus = newSisaHutang <= 0 ? 'lunas' : tagihan.status;

  const updated = await tagihanService.update(tagihan.id, {
    total_dibayar: newTotalDibayar,
    sisa_hutang: Math.max(0, newSisaHutang),
    status: newStatus,
  });

  await historyService.create({
    tagihan_id: tagihan.id,
    aksi: 'pembayaran',
    detail: `Pembayaran ${keterangan ? `(${keterangan})` : ''} pada ${tanggal}`,
    jumlah,
  });

  return updated;
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
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteImage(bucket: string, path: string): Promise<void> {
  try {
    const url = new URL(path);
    const storagePath = url.pathname.split(`/storage/v1/object/public/${bucket}/`)[1];
    if (storagePath) await supabase.storage.from(bucket).remove([storagePath]);
  } catch {}
}
