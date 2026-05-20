import type { Tagihan } from '@/shared/domain/tagihan/tagihan.types';

import { getPaymentInfo, getPaymentNote } from './tagihan-cycle';

export interface PaymentTotals {
  totalDibayar: number;
  sisaHutang: number;
  status: Tagihan['status'];
  isLunas: boolean;
}

export interface QuickPayValidationResult {
  valid: boolean;
  amount: number;
  message?: string;
}

export function calculatePaymentTotals(tagihan: Tagihan, jumlah: number): PaymentTotals {
  const amount = Number(jumlah);
  const totalDibayar = Number(tagihan.total_dibayar) + amount;
  const rawSisaHutang = Number(tagihan.total_hutang) - totalDibayar;
  const isLunas = rawSisaHutang <= 0;

  return {
    totalDibayar,
    sisaHutang: Math.max(0, rawSisaHutang),
    status: isLunas ? 'lunas' : tagihan.status,
    isLunas,
  };
}

export function validateQuickPay(tagihan: Tagihan | null | undefined, jumlah: number): QuickPayValidationResult {
  const amount = Number(jumlah);

  if (!tagihan) {
    return { valid: false, amount, message: 'Tagihan tidak tersedia.' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, amount, message: 'Jumlah pembayaran harus lebih dari 0.' };
  }

  if (tagihan.status === 'lunas') {
    return { valid: false, amount, message: 'Tagihan sudah lunas.' };
  }

  return { valid: true, amount };
}

export { getPaymentInfo, getPaymentNote };

