import { TAGIHAN_STATUSES, type TagihanStatus } from '../contracts/status';
import { toNullableNumber, toStringValue } from '../utils/normalization';

export type TagihanPreviewItem = {
  id: string;
  user_id?: string;
  debitur_nama: string;
  barang_nama: string;
  status: TagihanStatus;
  total_hutang: number;
  total_dibayar: number;
  sisa_hutang: number;
  cicilan_per_bulan: number;
  tanggal_jatuh_tempo?: string;
  created_at?: string;
};

export function normalizeTagihanStatus(value: unknown): TagihanStatus {
  const status = toStringValue(value) as TagihanStatus;
  return TAGIHAN_STATUSES.includes(status) ? status : 'aktif';
}

export function normalizeTagihanPreviewItem(input: Partial<TagihanPreviewItem>): TagihanPreviewItem {
  return {
    barang_nama: String(input.barang_nama ?? ''),
    cicilan_per_bulan: Number(toNullableNumber(input.cicilan_per_bulan) ?? 0),
    created_at: input.created_at ? String(input.created_at) : undefined,
    debitur_nama: String(input.debitur_nama ?? ''),
    id: String(input.id ?? ''),
    sisa_hutang: Number(toNullableNumber(input.sisa_hutang) ?? 0),
    status: normalizeTagihanStatus(input.status),
    tanggal_jatuh_tempo: input.tanggal_jatuh_tempo ? String(input.tanggal_jatuh_tempo) : undefined,
    total_dibayar: Number(toNullableNumber(input.total_dibayar) ?? 0),
    total_hutang: Number(toNullableNumber(input.total_hutang) ?? 0),
    user_id: input.user_id ? String(input.user_id) : undefined,
  };
}

export type PaymentTotals = {
  totalDibayar: number;
  sisaHutang: number;
  status: TagihanStatus;
  isLunas: boolean;
};

export type QuickPayValidationResult = {
  valid: boolean;
  amount: number;
  message?: string;
};

export function calculatePaymentTotals(
  tagihan: Pick<TagihanPreviewItem, 'status' | 'total_dibayar' | 'total_hutang'>,
  jumlah: number,
): PaymentTotals {
  const amount = Number(jumlah);
  const totalDibayar = Number(tagihan.total_dibayar) + amount;
  const rawSisaHutang = Number(tagihan.total_hutang) - totalDibayar;
  const isLunas = rawSisaHutang <= 0;

  return {
    isLunas,
    sisaHutang: Math.max(0, rawSisaHutang),
    status: isLunas ? 'lunas' : tagihan.status,
    totalDibayar,
  };
}

export function validateQuickPay(
  tagihan: Pick<TagihanPreviewItem, 'status'> | null | undefined,
  jumlah: number,
): QuickPayValidationResult {
  const amount = Number(jumlah);

  if (!tagihan) {
    return { amount, message: 'Tagihan tidak tersedia.', valid: false };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { amount, message: 'Jumlah pembayaran harus lebih dari 0.', valid: false };
  }

  if (tagihan.status === 'lunas') {
    return { amount, message: 'Tagihan sudah lunas.', valid: false };
  }

  return { amount, valid: true };
}
