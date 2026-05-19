import type { ObatItem as BaseObatItem } from '@/lib/types';

export type ObatItem = BaseObatItem;

export type ObatSortMode = 'terbaru' | 'nama_az' | 'tipe';
export type ObatFrequencyFilter = 'all' | 'rutin' | 'lainnya';

export type ObatFormValues = Pick<
  ObatItem,
  'name' | 'type' | 'dosage' | 'usage_info' | 'notes' | 'frequency' | 'side_effects'
>;

export type ObatInput = Partial<ObatFormValues>;

export const OBAT_TYPES = [
  'Analgesik',
  'Antibiotik',
  'Antasida',
  'Antihistamin',
  'Suplemen',
  'Vitamin',
  'Anti-inflamasi',
  'Antiseptik',
  'Lainnya',
] as const;

export const EMPTY_OBAT_FORM: ObatFormValues = {
  name: '',
  type: 'Lainnya',
  dosage: '',
  usage_info: '',
  notes: '',
  frequency: '',
  side_effects: '',
};
