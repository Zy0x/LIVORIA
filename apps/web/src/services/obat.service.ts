import { supabaseObatRepository } from '@/features/obat/services/obat.repository';
import type { ObatItem } from '@/lib/types';
import { deleteRow, insertRow, updateRow } from './crud.service';

export const obatService = {
  getAll: () => supabaseObatRepository.list() as Promise<ObatItem[]>,
  create: (row: Partial<ObatItem>) => insertRow<ObatItem>('obat', row),
  update: (id: string, row: Partial<ObatItem>) => updateRow<ObatItem>('obat', id, row),
  delete: (id: string) => deleteRow('obat', id),
};
