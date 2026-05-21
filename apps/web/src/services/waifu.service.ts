import type { WaifuItem } from '@/lib/types';
import { WAIFU_SELECT_COLUMNS } from '@/services/query-columns';
import { deleteRow, fetchAll, insertRow, updateRow } from './crud.service';

export const waifuService = {
  getAll: () => fetchAll<WaifuItem>('waifu', WAIFU_SELECT_COLUMNS),
  create: (row: Partial<WaifuItem>) => insertRow<WaifuItem>('waifu', row),
  update: (id: string, row: Partial<WaifuItem>) => updateRow<WaifuItem>('waifu', id, row),
  delete: (id: string) => deleteRow('waifu', id),
};
