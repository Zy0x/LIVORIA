import type { ObatItem } from '@/lib/types';
import { OBAT_SELECT_COLUMNS } from '@/services/query-columns';
import { deleteRow, fetchAll, insertRow, updateRow } from './crud.service';

export const obatService = {
  getAll: () => fetchAll<ObatItem>('obat', OBAT_SELECT_COLUMNS),
  create: (row: Partial<ObatItem>) => insertRow<ObatItem>('obat', row),
  update: (id: string, row: Partial<ObatItem>) => updateRow<ObatItem>('obat', id, row),
  delete: (id: string) => deleteRow('obat', id),
};
