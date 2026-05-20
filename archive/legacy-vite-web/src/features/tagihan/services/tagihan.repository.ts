import { supabase } from '@/lib/supabase';

import { calculatePaymentTotals } from '../domain/tagihan-payment';
import type { Tagihan, TagihanHistory } from '../types/tagihan.types';
import { historyRepository } from './history.repository';
import { mapTagihan, mapTagihanList } from './tagihan.mapper';

export interface CorrectPaymentInput {
  tagihan: Tagihan;
  totalDibayar: number;
  detail: string;
}

export const tagihanRepository = {
  async getAll(): Promise<Tagihan[]> {
    const { data, error } = await supabase
      .from('tagihan')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return mapTagihanList(data);
  },

  async getById(id: string): Promise<Tagihan> {
    const { data, error } = await supabase.from('tagihan').select('*').eq('id', id).single();
    if (error) throw error;
    return mapTagihan(data);
  },

  async create(row: Partial<Tagihan>): Promise<Tagihan> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tagihan')
      .insert({ ...row, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return mapTagihan(data);
  },

  async update(id: string, row: Partial<Tagihan>): Promise<Tagihan> {
    const { data, error } = await supabase.from('tagihan').update(row).eq('id', id).select().single();
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

