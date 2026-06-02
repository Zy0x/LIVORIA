import { useEffect, useState } from 'react';
import { useMutation, useQueryClient, type MutateOptions } from '@tanstack/react-query';

import { getPaymentInfo } from '../domain/tagihan-cycle';
import { validateQuickPay } from '../domain/tagihan-payment';
import { tagihanRepository } from '../services/tagihan.repository';
import type { Tagihan } from '../types/tagihan.types';
import { QUERY_KEYS } from '@/app/query-keys';

interface QuickPayInput {
  tagihan: Tagihan;
  jumlah: number;
  tanggal: string;
  keterangan: string;
}

export function useQuickPay() {
  const queryClient = useQueryClient();
  const [item, setItem] = useState<Tagihan | null>(null);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [payFull, setPayFull] = useState(false);

  const upsertTagihanCache = (updated: Tagihan) => {
    queryClient.setQueryData<Tagihan[]>(QUERY_KEYS.TAGIHAN, (current) => {
      if (!current) return [updated];
      const index = current.findIndex((tagihan) => tagihan.id === updated.id);
      if (index === -1) return [updated, ...current];
      const next = [...current];
      next[index] = updated;
      return next;
    });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN, refetchType: 'inactive' });
  };

  const mutation = useMutation({
    mutationFn: ({ tagihan, jumlah, tanggal, keterangan }: QuickPayInput) =>
      tagihanRepository.recordPayment(tagihan, jumlah, tanggal, keterangan),
    onSuccess: async (updated) => {
      upsertTagihanCache(updated);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN_HISTORY(updated.id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
      close();
    },
  });

  useEffect(() => {
    if (!item) return;
    const info = getPaymentInfo(item, new Date());
    setNote(info.note);
    setAmount(payFull ? Number(item.sisa_hutang) : Number(item.cicilan_per_bulan));
    setDate(new Date().toISOString().split('T')[0]);
  }, [item, payFull]);

  const open = (target: Tagihan, full = false) => {
    setPayFull(full);
    setItem(target);
  };

  const close = () => {
    setItem(null);
    setAmount(0);
    setNote('');
    setPayFull(false);
  };

  const submit = (options?: MutateOptions<Tagihan, Error, QuickPayInput>) => {
    if (!item || !validateQuickPay(item, amount).valid) return;
    mutation.mutate({ tagihan: item, jumlah: amount, tanggal: date, keterangan: note }, options);
  };

  return {
    item,
    amount,
    date,
    note,
    payFull,
    setAmount,
    setDate,
    setNote,
    setPayFull,
    open,
    close,
    submit,
    mutation,
  };
}
