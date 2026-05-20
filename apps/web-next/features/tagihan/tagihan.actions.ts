'use server';

import {
  buildUserStoragePath,
  calculatePaymentTotals,
  normalizeTagihanPreviewItem,
  normalizeTagihanStatus,
  validateQuickPay,
} from '@livoria/core';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type TagihanActionState = {
  ok: boolean;
  message: string;
};

type PaymentResult = {
  isLunas: boolean;
  sisaHutang: number;
  status: string;
  totalDibayar: number;
};

const initialState: TagihanActionState = {
  message: '',
  ok: false,
};

const STRUK_BUCKET = 'struk';
const MAX_STRUK_BYTES = 5 * 1024 * 1024;
const ALLOWED_STRUK_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export { initialState as initialTagihanActionState };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : 0;
}

function nullableString(value: string) {
  const text = value.trim();
  return text || null;
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

function readTagihanInput(formData: FormData, userId: string) {
  const hargaAwal = readNumber(formData, 'harga_awal');
  const bungaPersen = readNumber(formData, 'bunga_persen');
  const jangkaWaktu = readNumber(formData, 'jangka_waktu_bulan') || 1;
  const totalHutangInput = readNumber(formData, 'total_hutang');
  const totalHutang = totalHutangInput || Math.max(0, hargaAwal + (hargaAwal * bungaPersen / 100));
  const totalDibayar = readNumber(formData, 'total_dibayar');
  const cicilanInput = readNumber(formData, 'cicilan_per_bulan');
  const cicilanPerBulan = cicilanInput || Math.ceil(totalHutang / Math.max(1, jangkaWaktu));
  const status = normalizeTagihanStatus(readString(formData, 'status'));

  return {
    barang_nama: readString(formData, 'barang_nama').trim(),
    bunga_persen: bungaPersen,
    catatan: nullableString(readString(formData, 'catatan')),
    cicilan_per_bulan: cicilanPerBulan,
    debitur_kontak: nullableString(readString(formData, 'debitur_kontak')),
    debitur_nama: readString(formData, 'debitur_nama').trim(),
    denda_persen_per_hari: readNumber(formData, 'denda_persen_per_hari'),
    harga_awal: hargaAwal,
    jangka_waktu_bulan: jangkaWaktu,
    jenis_tempo: nullableString(readString(formData, 'jenis_tempo')) ?? 'bulanan',
    keuntungan_estimasi: Math.max(0, totalHutang - hargaAwal),
    kuantitas: readNumber(formData, 'kuantitas') || 1,
    metode_pembayaran: nullableString(readString(formData, 'metode_pembayaran')),
    sisa_hutang: Math.max(0, totalHutang - totalDibayar),
    sumber_modal: nullableString(readString(formData, 'sumber_modal')) ?? 'modal_terpisah',
    status: totalDibayar >= totalHutang && totalHutang > 0 ? 'lunas' : status,
    tanggal_jatuh_tempo: nullableString(readString(formData, 'tanggal_jatuh_tempo')),
    tanggal_mulai: nullableString(readString(formData, 'tanggal_mulai')),
    tanggal_mulai_bayar: nullableString(readString(formData, 'tanggal_mulai_bayar')),
    tgl_bayar_hari: nullableString(readString(formData, 'tgl_bayar_hari')),
    tgl_bayar_tanggal: readNumber(formData, 'tgl_bayar_tanggal') || null,
    tgl_tempo_hari: nullableString(readString(formData, 'tgl_tempo_hari')),
    tgl_tempo_tanggal: readNumber(formData, 'tgl_tempo_tanggal') || null,
    total_dibayar: totalDibayar,
    total_hutang: totalHutang,
    user_id: userId,
  };
}

async function getOwnedTagihan(input: {
  id: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const { data, error } = await input.supabase
    .from('tagihan')
    .select('id,user_id,debitur_nama,barang_nama,status,total_hutang,total_dibayar,sisa_hutang,cicilan_per_bulan,tanggal_jatuh_tempo,created_at')
    .eq('id', input.id)
    .eq('user_id', input.userId)
    .single();

  if (error) throw error;
  return normalizeTagihanPreviewItem(data as Record<string, unknown>);
}

async function recordPayment(input: {
  amount: number;
  id: string;
  keterangan: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  tanggal: string;
  userId: string;
}): Promise<PaymentResult> {
  const tagihan = await getOwnedTagihan({ id: input.id, supabase: input.supabase, userId: input.userId });
  const validation = validateQuickPay(tagihan, input.amount);
  if (!validation.valid) throw new Error(validation.message ?? 'Pembayaran tidak valid.');

  const rpcResult = await input.supabase.rpc('record_tagihan_payment', {
    p_amount: validation.amount,
    p_keterangan: input.keterangan,
    p_tagihan_id: tagihan.id,
    p_tanggal: input.tanggal,
  });

  if (!rpcResult.error) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    if (row && typeof row === 'object') {
      const result = row as Record<string, unknown>;
      return {
        isLunas: Boolean(result.is_lunas),
        sisaHutang: Number(result.sisa_hutang ?? 0),
        status: String(result.status ?? tagihan.status),
        totalDibayar: Number(result.total_dibayar ?? tagihan.total_dibayar + validation.amount),
      };
    }
  }

  const rpcMissing = rpcResult.error?.code === 'PGRST202' ||
    rpcResult.error?.message?.toLowerCase().includes('record_tagihan_payment');
  if (!rpcMissing) throw rpcResult.error;

  const totals = calculatePaymentTotals(tagihan, validation.amount);
  const updateResult = await input.supabase
    .from('tagihan')
    .update({
      sisa_hutang: totals.sisaHutang,
      status: totals.status,
      total_dibayar: totals.totalDibayar,
    })
    .eq('id', tagihan.id)
    .eq('user_id', input.userId);

  if (updateResult.error) throw updateResult.error;

  const historyResult = await input.supabase.from('tagihan_history').insert({
    aksi: 'pembayaran',
    detail: `Pembayaran ${input.keterangan ? `(${input.keterangan})` : ''} pada ${input.tanggal}`,
    jumlah: validation.amount,
    tagihan_id: tagihan.id,
    user_id: input.userId,
  });

  if (historyResult.error) throw historyResult.error;

  return {
    isLunas: totals.isLunas,
    sisaHutang: totals.sisaHutang,
    status: totals.status,
    totalDibayar: totals.totalDibayar,
  };
}

async function uploadStruk(input: {
  file: File;
  keterangan: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  tagihanId: string;
  userId: string;
}) {
  if (!ALLOWED_STRUK_TYPES.has(input.file.type)) {
    throw new Error('Struk harus berupa JPG, PNG, WEBP, atau PDF.');
  }
  if (input.file.size > MAX_STRUK_BYTES) {
    throw new Error('Ukuran struk maksimal 5MB.');
  }

  await getOwnedTagihan({ id: input.tagihanId, supabase: input.supabase, userId: input.userId });
  const path = buildUserStoragePath({
    fileName: input.file.name,
    folder: 'struk',
    nestedFolder: input.tagihanId,
    suffix: crypto.randomUUID(),
    timestamp: Date.now(),
    userId: input.userId,
  });

  const uploadResult = await input.supabase.storage.from(STRUK_BUCKET).upload(path, input.file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadResult.error) throw uploadResult.error;

  const insertResult = await input.supabase.from('struk').insert({
    file_name: input.file.name,
    file_type: input.file.type,
    file_url: path,
    keterangan: input.keterangan || null,
    tagihan_id: input.tagihanId,
    user_id: input.userId,
  });
  if (insertResult.error) throw insertResult.error;
}

export async function submitTagihanAction(
  _previousState: TagihanActionState,
  formData: FormData,
): Promise<TagihanActionState> {
  try {
    const intent = readString(formData, 'intent');
    const id = readString(formData, 'id');
    const { supabase, user } = await requireUser();

    if (intent === 'create') {
      const input = readTagihanInput(formData, user.id);
      if (!input.debitur_nama || !input.barang_nama) throw new Error('Debitur dan barang wajib diisi.');
      const { error } = await supabase.from('tagihan').insert(input);
      if (error) throw error;
      revalidatePath('/tagihan');
      return { message: 'Tagihan ditambahkan.', ok: true };
    }

    if (!id) throw new Error('ID tagihan tidak valid.');

    if (intent === 'update') {
      const input = readTagihanInput(formData, user.id);
      if (!input.debitur_nama || !input.barang_nama) throw new Error('Debitur dan barang wajib diisi.');
      const { user_id: _userId, ...payload } = input;
      const { error } = await supabase.from('tagihan').update(payload).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      revalidatePath('/tagihan');
      return { message: 'Tagihan diperbarui.', ok: true };
    }

    if (intent === 'delete') {
      const { error } = await supabase.from('tagihan').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      revalidatePath('/tagihan');
      return { message: 'Tagihan dihapus.', ok: true };
    }

    if (intent === 'quick_pay' || intent === 'pay_full') {
      const tagihan = await getOwnedTagihan({ id, supabase, userId: user.id });
      const amount = intent === 'pay_full' ? tagihan.sisa_hutang : readNumber(formData, 'jumlah');
      const totals = await recordPayment({
        amount,
        id,
        keterangan: readString(formData, 'keterangan').slice(0, 200),
        supabase,
        tanggal: readString(formData, 'tanggal') || todayLocalDate(),
        userId: user.id,
      });

      revalidatePath('/tagihan');
      return {
        message: totals.isLunas ? 'Tagihan sudah lunas.' : 'Pembayaran dicatat.',
        ok: true,
      };
    }

    if (intent === 'upload_struk') {
      const file = formData.get('struk_file');
      if (!(file instanceof File) || file.size === 0) throw new Error('File struk belum dipilih.');
      await uploadStruk({
        file,
        keterangan: readString(formData, 'keterangan').slice(0, 200),
        supabase,
        tagihanId: id,
        userId: user.id,
      });
      revalidatePath('/tagihan');
      return { message: 'Struk berhasil diunggah.', ok: true };
    }

    if (intent === 'delete_struk') {
      const strukId = readString(formData, 'struk_id');
      if (!strukId) throw new Error('ID struk tidak valid.');
      const { data, error } = await supabase
        .from('struk')
        .select('id,file_url')
        .eq('id', strukId)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      const fileUrl = String((data as { file_url?: unknown }).file_url ?? '');
      const deleteResult = await supabase.from('struk').delete().eq('id', strukId).eq('user_id', user.id);
      if (deleteResult.error) throw deleteResult.error;
      if (fileUrl && !fileUrl.startsWith('http')) {
        await supabase.storage.from(STRUK_BUCKET).remove([fileUrl]);
      }
      revalidatePath('/tagihan');
      return { message: 'Struk dihapus.', ok: true };
    }

    throw new Error('Aksi Tagihan tidak dikenal.');
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Aksi Tagihan gagal.',
      ok: false,
    };
  }
}
