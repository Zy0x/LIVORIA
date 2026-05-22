import { normalizeObatItem, type ObatItem } from '@livoria/core/domain';
import { getSupabaseClient } from './client';

type ObatRow = Partial<ObatItem>;

const OBAT_SELECT_COLUMNS = [
  'id',
  'user_id',
  'name',
  'type',
  'dosage',
  'usage_info',
  'frequency',
  'side_effects',
  'notes',
  'created_at',
].join(',');

const placeholderObat: ObatItem[] = [
  normalizeObatItem({
    id: 'prototype-paracetamol',
    name: 'Paracetamol',
    type: 'Analgesik',
    dosage: '500 mg',
    frequency: 'Jika perlu',
    usage_info: 'Placeholder prototype mobile.',
  }),
  normalizeObatItem({
    id: 'prototype-vitamin-c',
    name: 'Vitamin C',
    type: 'Vitamin',
    dosage: '500 mg',
    frequency: '1x sehari',
    usage_info: 'Data contoh saat Supabase belum dikonfigurasi.',
  }),
];

export async function listObat(): Promise<{ items: ObatItem[]; source: 'placeholder' | 'supabase' }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { items: placeholderObat, source: 'placeholder' };
  }

  const { data, error } = await supabase
    .from('obat')
    .select(OBAT_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    items: ((data ?? []) as ObatRow[]).map((row) => normalizeObatItem(row)),
    source: 'supabase',
  };
}
