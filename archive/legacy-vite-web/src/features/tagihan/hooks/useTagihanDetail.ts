import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { strukRepository } from '../services/struk.repository';
import { historyRepository } from '../services/history.repository';
import { tagihanRepository } from '../services/tagihan.repository';
import type { Tagihan } from '../types/tagihan.types';

export function useTagihanDetail(item: Tagihan, onRefresh?: () => void) {
  const queryClient = useQueryClient();

  const strukQuery = useQuery({
    queryKey: ['struk', item.id],
    queryFn: () => strukRepository.getByTagihan(item.id),
  });

  const historyQuery = useQuery({
    queryKey: ['history', item.id],
    queryFn: () => historyRepository.getByTagihan(item.id),
  });

  const invalidateDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tagihan'] });
    await queryClient.invalidateQueries({ queryKey: ['history', item.id] });
    await queryClient.invalidateQueries({ queryKey: ['struk', item.id] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    onRefresh?.();
  };

  const payMut = useMutation({
    mutationFn: ({ amount, date, note }: { amount: number; date: string; note: string }) =>
      tagihanRepository.recordPayment(item, amount, date, note),
    onSuccess: invalidateDetail,
  });

  const revertMut = useMutation({
    mutationFn: ({ historyId, jumlah }: { historyId: string; jumlah: number }) =>
      tagihanRepository.revertPayment(item, historyId, jumlah),
    onSuccess: invalidateDetail,
  });

  const uploadMut = useMutation({
    mutationFn: ({ file, keterangan }: { file: File; keterangan: string }) =>
      strukRepository.upload(file, item.id, keterangan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['struk', item.id] }),
  });

  const deleteStrukMut = useMutation({
    mutationFn: (id: string) => strukRepository.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['struk', item.id] }),
  });

  return {
    strukList: strukQuery.data ?? [],
    history: historyQuery.data ?? [],
    strukQuery,
    historyQuery,
    payMut,
    revertMut,
    uploadMut,
    deleteStrukMut,
  };
}

