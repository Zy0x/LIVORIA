'use server';

import {
  calculatePaymentTotals,
  normalizeTagihanPreviewItem,
  validateQuickPay,
} from '@livoria/core';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type TagihanActionState = {
  ok: boolean;
  message: string;
};

const initialState: TagihanActionState = {
  message: '',
  ok: false,
};

export { initialState as initialTagihanActionState };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : 0;
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Masuk terlebih dahulu untuk mengubah data Tagihan.');

  return { supabase, user };
}

function todayLocalDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function submitTagihanAction(
  _previousState: TagihanActionState,
  formData: FormData,
): Promise<TagihanActionState> {
  try {
    const intent = readString(formData, 'intent');
    const id = readString(formData, 'id');
    const { supabase, user } = await requireUser();

    if (!id) throw new Error('ID tagihan tidak valid.');
    if (intent !== 'quick_pay' && intent !== 'pay_full') {
      throw new Error('Aksi Tagihan tidak dikenal.');
    }

    const { data, error } = await supabase
      .from('tagihan')
      .select('id,user_id,debitur_nama,barang_nama,status,total_hutang,total_dibayar,sisa_hutang,cicilan_per_bulan,tanggal_jatuh_tempo,created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    const tagihan = normalizeTagihanPreviewItem(data as Record<string, unknown>);
    const amount = intent === 'pay_full' ? tagihan.sisa_hutang : readNumber(formData, 'jumlah');
    const validation = validateQuickPay(tagihan, amount);
    if (!validation.valid) throw new Error(validation.message ?? 'Pembayaran tidak valid.');

    const tanggal = readString(formData, 'tanggal') || todayLocalDate();
    const keterangan = readString(formData, 'keterangan').slice(0, 200);
    const totals = calculatePaymentTotals(tagihan, validation.amount);

    const updateResult = await supabase
      .from('tagihan')
      .update({
        sisa_hutang: totals.sisaHutang,
        status: totals.status,
        total_dibayar: totals.totalDibayar,
      })
      .eq('id', tagihan.id)
      .eq('user_id', user.id);

    if (updateResult.error) throw updateResult.error;

    const historyResult = await supabase.from('tagihan_history').insert({
      aksi: 'pembayaran',
      detail: `Pembayaran ${keterangan ? `(${keterangan})` : ''} pada ${tanggal}`,
      jumlah: validation.amount,
      tagihan_id: tagihan.id,
      user_id: user.id,
    });

    if (historyResult.error) throw historyResult.error;

    revalidatePath('/tagihan');
    return {
      message: totals.isLunas ? 'Tagihan sudah lunas.' : 'Pembayaran dicatat.',
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Aksi Tagihan gagal.',
      ok: false,
    };
  }
}
