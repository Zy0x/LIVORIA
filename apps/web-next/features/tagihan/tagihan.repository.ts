import {
  normalizeTagihanPreviewItem,
  toNullableNumber,
  type TagihanPreviewItem,
  type TagihanStatus,
} from '@livoria/core';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type TagihanSortMode = 'terbaru' | 'debitur' | 'tempo' | 'sisa';

export type TagihanQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort: TagihanSortMode;
  status: TagihanStatus | 'all';
};

export type TagihanItem = TagihanPreviewItem & {
  bunga_persen: number;
  catatan: string | null;
  debitur_kontak: string | null;
  denda_persen_per_hari: number;
  harga_awal: number;
  jangka_waktu_bulan: number;
  jenis_tempo: string | null;
  keuntungan_estimasi: number;
  kuantitas: number;
  metode_pembayaran: string | null;
  sumber_modal: string | null;
  tanggal_mulai: string | null;
  tanggal_mulai_bayar: string | null;
  tgl_bayar_hari: string | null;
  tgl_bayar_tanggal: number | null;
  tgl_tempo_hari: string | null;
  tgl_tempo_tanggal: number | null;
};

export type TagihanHistoryItem = {
  aksi: string;
  created_at?: string;
  detail: string;
  id: string;
  jumlah: number;
  tagihan_id: string;
};

export type TagihanStrukItem = {
  created_at?: string;
  file_name: string;
  file_type: string;
  file_url: string;
  id: string;
  keterangan: string | null;
  signed_url?: string;
  tagihan_id: string;
};

export type TagihanReport = {
  aktifCount: number;
  lunasCount: number;
  overdueCount: number;
  totalDibayar: number;
  totalHutang: number;
  totalKeuntungan: number;
  totalSisa: number;
};

export type TagihanPreviewState =
  | {
      histories: TagihanHistoryItem[];
      items: TagihanItem[];
      message: string;
      status: 'unconfigured';
      struk: TagihanStrukItem[];
    }
  | {
      histories: TagihanHistoryItem[];
      items: TagihanItem[];
      message: string;
      status: 'unauthenticated';
      struk: TagihanStrukItem[];
    }
  | {
      exportItems: TagihanItem[];
      histories: TagihanHistoryItem[];
      items: TagihanItem[];
      message: string;
      page: number;
      pageSize: number;
      query: TagihanQuery;
      report: TagihanReport;
      status: 'ready';
      struk: TagihanStrukItem[];
      total: number;
      totalFiltered: number;
      totalPages: number;
    }
  | {
      histories: TagihanHistoryItem[];
      items: TagihanItem[];
      message: string;
      status: 'error';
      struk: TagihanStrukItem[];
    };

const DEFAULT_QUERY: TagihanQuery = {
  page: 1,
  pageSize: 12,
  search: '',
  sort: 'terbaru',
  status: 'all',
};

export function normalizeTagihanQuery(input: Partial<TagihanQuery> = {}): TagihanQuery {
  const status = input.status === 'aktif' || input.status === 'lunas' || input.status === 'overdue' || input.status === 'ditunda'
    ? input.status
    : 'all';
  const sort = input.sort === 'debitur' || input.sort === 'tempo' || input.sort === 'sisa' ? input.sort : 'terbaru';
  const page = Number.isFinite(Number(input.page)) ? Math.max(1, Math.floor(Number(input.page))) : DEFAULT_QUERY.page;
  const pageSize = Number.isFinite(Number(input.pageSize))
    ? Math.min(48, Math.max(6, Math.floor(Number(input.pageSize))))
    : DEFAULT_QUERY.pageSize;

  return {
    page,
    pageSize,
    search: typeof input.search === 'string' ? input.search.trim() : '',
    sort,
    status,
  };
}

function toNumber(value: unknown) {
  return Number(toNullableNumber(value) ?? 0);
}

function mapTagihanItem(row: Record<string, unknown>): TagihanItem {
  return {
    ...normalizeTagihanPreviewItem(row),
    bunga_persen: toNumber(row.bunga_persen),
    catatan: row.catatan == null ? null : String(row.catatan),
    debitur_kontak: row.debitur_kontak == null ? null : String(row.debitur_kontak),
    denda_persen_per_hari: toNumber(row.denda_persen_per_hari),
    harga_awal: toNumber(row.harga_awal),
    jangka_waktu_bulan: toNumber(row.jangka_waktu_bulan),
    jenis_tempo: row.jenis_tempo == null ? null : String(row.jenis_tempo),
    keuntungan_estimasi: toNumber(row.keuntungan_estimasi),
    kuantitas: toNumber(row.kuantitas) || 1,
    metode_pembayaran: row.metode_pembayaran == null ? null : String(row.metode_pembayaran),
    sumber_modal: row.sumber_modal == null ? null : String(row.sumber_modal),
    tanggal_mulai: row.tanggal_mulai == null ? null : String(row.tanggal_mulai),
    tanggal_mulai_bayar: row.tanggal_mulai_bayar == null ? null : String(row.tanggal_mulai_bayar),
    tgl_bayar_hari: row.tgl_bayar_hari == null ? null : String(row.tgl_bayar_hari),
    tgl_bayar_tanggal: toNullableNumber(row.tgl_bayar_tanggal),
    tgl_tempo_hari: row.tgl_tempo_hari == null ? null : String(row.tgl_tempo_hari),
    tgl_tempo_tanggal: toNullableNumber(row.tgl_tempo_tanggal),
  };
}

function mapHistory(row: Record<string, unknown>): TagihanHistoryItem {
  return {
    aksi: String(row.aksi ?? ''),
    created_at: row.created_at ? String(row.created_at) : undefined,
    detail: String(row.detail ?? ''),
    id: String(row.id ?? ''),
    jumlah: toNumber(row.jumlah),
    tagihan_id: String(row.tagihan_id ?? ''),
  };
}

function mapStruk(row: Record<string, unknown>): TagihanStrukItem {
  return {
    created_at: row.created_at ? String(row.created_at) : undefined,
    file_name: String(row.file_name ?? ''),
    file_type: String(row.file_type ?? ''),
    file_url: String(row.file_url ?? ''),
    id: String(row.id ?? ''),
    keterangan: row.keterangan == null ? null : String(row.keterangan),
    tagihan_id: String(row.tagihan_id ?? ''),
  };
}

function applyTagihanQuery(items: TagihanItem[], query: TagihanQuery) {
  const search = query.search.toLowerCase();
  const filtered = items.filter((item) => {
    const matchesStatus = query.status === 'all' || item.status === query.status;
    const matchesSearch = !search ||
      item.debitur_nama.toLowerCase().includes(search) ||
      item.barang_nama.toLowerCase().includes(search) ||
      (item.debitur_kontak ?? '').toLowerCase().includes(search) ||
      (item.catatan ?? '').toLowerCase().includes(search);

    return matchesStatus && matchesSearch;
  });

  filtered.sort((a, b) => {
    if (query.sort === 'debitur') return a.debitur_nama.localeCompare(b.debitur_nama);
    if (query.sort === 'tempo') {
      return new Date(a.tanggal_jatuh_tempo ?? 0).getTime() - new Date(b.tanggal_jatuh_tempo ?? 0).getTime();
    }
    if (query.sort === 'sisa') return b.sisa_hutang - a.sisa_hutang;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });

  return filtered;
}

function getReport(items: TagihanItem[]): TagihanReport {
  return {
    aktifCount: items.filter((item) => item.status === 'aktif').length,
    lunasCount: items.filter((item) => item.status === 'lunas').length,
    overdueCount: items.filter((item) => item.status === 'overdue').length,
    totalDibayar: items.reduce((sum, item) => sum + item.total_dibayar, 0),
    totalHutang: items.reduce((sum, item) => sum + item.total_hutang, 0),
    totalKeuntungan: items.reduce((sum, item) => sum + item.keuntungan_estimasi, 0),
    totalSisa: items.reduce((sum, item) => sum + item.sisa_hutang, 0),
  };
}

async function attachSignedStrukUrls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: TagihanStrukItem[],
) {
  return Promise.all(rows.map(async (item) => {
    if (!item.file_url || item.file_url.startsWith('http')) return item;
    const { data } = await supabase.storage.from('struk').createSignedUrl(item.file_url, 60 * 10);
    return { ...item, signed_url: data?.signedUrl };
  }));
}

export async function getTagihanPreview(inputQuery: Partial<TagihanQuery> = {}): Promise<TagihanPreviewState> {
  const query = normalizeTagihanQuery(inputQuery);
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      histories: [],
      items: [],
      message: 'Konfigurasi data publik belum tersedia.',
      status: 'unconfigured',
      struk: [],
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      return {
        histories: [],
        items: [],
        message: 'Masuk terlebih dahulu untuk melihat data Tagihan.',
        status: 'unauthenticated',
        struk: [],
      };
    }

    const [tagihanResult, historyResult, strukResult] = await Promise.all([
      supabase.from('tagihan').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2000),
      supabase.from('tagihan_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
      supabase.from('struk').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
    ]);

    if (tagihanResult.error) throw tagihanResult.error;
    if (historyResult.error) throw historyResult.error;
    if (strukResult.error) throw strukResult.error;

    const allItems = ((tagihanResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapTagihanItem);
    const exportItems = applyTagihanQuery(allItems, query);
    const totalPages = Math.max(1, Math.ceil(exportItems.length / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    const items = exportItems.slice(start, start + query.pageSize);
    const struk = await attachSignedStrukUrls(
      supabase,
      ((strukResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapStruk),
    );

    return {
      exportItems,
      histories: ((historyResult.data ?? []) as unknown as Record<string, unknown>[]).map(mapHistory),
      items,
      message: `${exportItems.length} dari ${allItems.length} data tagihan siap ditampilkan.`,
      page,
      pageSize: query.pageSize,
      query: { ...query, page },
      report: getReport(allItems),
      status: 'ready',
      struk,
      total: allItems.length,
      totalFiltered: exportItems.length,
      totalPages,
    };
  } catch (error) {
    return {
      histories: [],
      items: [],
      message: error instanceof Error ? error.message : 'Tagihan gagal dimuat.',
      status: 'error',
      struk: [],
    };
  }
}
