import { supabaseWaifuRepository } from '@/features/waifu/services/waifu.repository';
import type { WaifuItem } from '@/lib/types';
import { deleteRow, insertRow, updateRow } from './crud.service';

export const waifuService = {
  getAll: () => supabaseWaifuRepository.list() as Promise<WaifuItem[]>,
  create: (row: Partial<WaifuItem>) => insertRow<WaifuItem>('waifu', row),
  update: (id: string, row: Partial<WaifuItem>) => updateRow<WaifuItem>('waifu', id, row),
  delete: (id: string) => deleteRow('waifu', id),
};
