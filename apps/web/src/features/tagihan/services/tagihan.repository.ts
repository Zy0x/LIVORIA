import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

import { calculatePaymentTotals } from '../domain/tagihan-payment';
import type { Tagihan, TagihanHistory } from '../types/tagihan.types';
import { historyRepository } from './history.repository';
import { mapTagihan, mapTagihanList } from './tagihan.mapper';
import { TAGIHAN_SELECT_COLUMNS } from '@/services/query-columns';

export interface CorrectPaymentInput {
  tagihan: Tagihan;
  totalDibayar: number;
  detail: string;
}

async function getSessionUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export const tagihanRepository = {
  async getAll(): Promise<Tagihan[]> {
    const userId = await getSessionUserId();
    const { data, error } = await supabase
      .from('tagihan')
      .select(TAGIHAN_SELECT_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return mapTagihanList(data);
  },

  async getById(id: string): Promise<Tagihan> {
    const { data, error } = await supabase.from('tagihan').select(TAGIHAN_SELECT_COLUMNS).eq('id', id).single();
    if (error) throw error;
    return mapTagihan(data);
  },

  async create(row: Partial<Tagihan>): Promise<Tagihan> {
    const userId = await getSessionUserId();
    const insertRow = { ...row, user_id: userId } as TablesInsert<'tagihan'>;

    const { data, error } = await supabase
      .from('tagihan')
      .insert(insertRow)
      .select(TAGIHAN_SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapTagihan(data);
  },

  async update(id: string, row: Partial<Tagihan>): Promise<Tagihan> {
    const { data, error } = await supabase.from('tagihan').update(row).eq('id', id).select(TAGIHAN_SELECT_COLUMNS).single();
    if (error) throw error;
    return mapTagihan(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tagihan').delete().eq('id', id);
    if (error) throw error;
  },

  async recordPayment(tagihan: Tagihan, jumlah: number, tanggal: string, keterangan = ''): Promise<Tagihan> {
    const totals = calculatePaymentTotals(tagihan, jumlah);

    const updated = await this.update(tagihan.id, {
      total_dibayar: totals.totalDibayar,
      sisa_hutang: totals.sisaHutang,
      status: totals.status,
    });

    await historyRepository.create({
      tagihan_id: tagihan.id,
      aksi: 'pembayaran',
      detail: `Pembayaran ${keterangan ? `(${keterangan})` : ''} pada ${tanggal}`,
      jumlah,
    });

    return updated;
  },

  async revertPayment(tagihan: Tagihan, historyId: string, jumlah: number): Promise<Tagihan> {
    const totalDibayar = Math.max(0, Number(tagihan.total_dibayar) - jumlah);
    const rawSisaHutang = Number(tagihan.total_hutang) - totalDibayar;
    const status = rawSisaHutang <= 0
      ? 'lunas'
      : tagihan.status === 'lunas'
      ? 'aktif'
      : tagihan.status;

    await historyRepository.delete(historyId);
    const updated = await this.update(tagihan.id, {
      total_dibayar: totalDibayar,
      sisa_hutang: Math.max(0, rawSisaHutang),
      status,
    });

    await historyRepository.create({
      tagihan_id: tagihan.id,
      aksi: 'pembayaran_dibatalkan',
      detail: `Pembayaran Rp${jumlah.toLocaleString('id-ID')} dibatalkan/dikembalikan`,
      jumlah: 0,
    });

    return updated;
  },

  async correctPayment({ tagihan, totalDibayar, detail }: CorrectPaymentInput): Promise<Tagihan> {
    const sisaHutang = Math.max(0, Number(tagihan.total_hutang) - totalDibayar);
    const status = sisaHutang <= 0 ? 'lunas' : tagihan.status === 'lunas' ? 'aktif' : tagihan.status;

    const updated = await this.update(tagihan.id, {
      total_dibayar: totalDibayar,
      sisa_hutang: sisaHutang,
      status,
    });

    await historyRepository.create({
      tagihan_id: tagihan.id,
      aksi: 'koreksi',
      detail,
      jumlah: totalDibayar,
    } satisfies Partial<TagihanHistory>);

    return updated;
  },
};
