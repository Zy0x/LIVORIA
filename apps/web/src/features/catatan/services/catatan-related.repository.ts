import { ROUTES } from '@/app/route-paths';
import { supabase } from '@/integrations/supabase/client';
import type { CatatanRelatedOption, CatatanRelatedType } from '../types/catatan.types';
import { CATATAN_RELATED_TYPE_LABELS } from '../types/catatan.types';

type RelatedRow = Record<string, unknown>;

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const asNumber = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : null);

const makeSearchText = (...parts: unknown[]) =>
  parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const makeOption = (
  type: CatatanRelatedType,
  id: string,
  title: string,
  subtitle: string,
  route: string,
  ...searchParts: unknown[]
): CatatanRelatedOption => ({
  type,
  id,
  title,
  subtitle,
  route,
  searchText: makeSearchText(CATATAN_RELATED_TYPE_LABELS[type], title, subtitle, ...searchParts),
});

const readRows = async <T extends RelatedRow>(query: PromiseLike<{ data: T[] | null; error: unknown }>) => {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

export async function listCatatanRelatedOptions(): Promise<CatatanRelatedOption[]> {
  const [tagihanRows, animeRows, donghuaRows, waifuRows, obatRows] = await Promise.all([
    readRows(
      supabase
        .from('tagihan')
        .select('id,debitur_nama,barang_nama,status,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
    readRows(
      supabase
        .from('anime')
        .select('id,title,status,release_year,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
    readRows(
      supabase
        .from('donghua')
        .select('id,title,status,release_year,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
    readRows(
      supabase
        .from('waifu')
        .select('id,name,source,tier,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
    readRows(
      supabase
        .from('obat')
        .select('id,name,type,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
  ]);

  return [
    ...tagihanRows.map((row) => {
      const debitur = asString(row.debitur_nama, 'Debitur');
      const barang = asString(row.barang_nama, 'Barang');
      return makeOption(
        'tagihan',
        asString(row.id),
        `${debitur} - ${barang}`,
        `Tagihan - ${asString(row.status, 'aktif')}`,
        ROUTES.TAGIHAN,
        debitur,
        barang,
      );
    }),
    ...animeRows.map((row) => {
      const year = asNumber(row.release_year);
      return makeOption(
        'anime',
        asString(row.id),
        asString(row.title, 'Anime'),
        year ? `Anime - ${year}` : `Anime - ${asString(row.status, 'status')}`,
        ROUTES.ANIME,
        row.title,
        row.status,
        year,
      );
    }),
    ...donghuaRows.map((row) => {
      const year = asNumber(row.release_year);
      return makeOption(
        'donghua',
        asString(row.id),
        asString(row.title, 'Donghua'),
        year ? `Donghua - ${year}` : `Donghua - ${asString(row.status, 'status')}`,
        ROUTES.DONGHUA,
        row.title,
        row.status,
        year,
      );
    }),
    ...waifuRows.map((row) =>
      makeOption(
        'waifu',
        asString(row.id),
        asString(row.name, 'Waifu'),
        `Waifu - Tier ${asString(row.tier, '-')}`,
        ROUTES.WAIFU,
        row.name,
        row.source,
        row.tier,
      ),
    ),
    ...obatRows.map((row) =>
      makeOption(
        'obat',
        asString(row.id),
        asString(row.name, 'Obat'),
        `Obat - ${asString(row.type, 'Umum')}`,
        ROUTES.OBAT,
        row.name,
        row.type,
      ),
    ),
  ].filter((option) => option.id);
}
