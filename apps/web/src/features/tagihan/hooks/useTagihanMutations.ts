import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Tagihan } from '../types/tagihan.types';
import { historyRepository } from '../services/history.repository';
import { strukRepository } from '../services/struk.repository';
import { tagihanRepository, type CorrectPaymentInput } from '../services/tagihan.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export function useTagihanMutations() {
  const queryClient = useQueryClient();

  const invalidateTagihan = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
    if (id) {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN_HISTORY(id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN_STRUK(id) });
    }
  };

  const createTagihan = useMutation({
    mutationFn: async ({ data, files }: { data: Partial<Tagihan>; files?: File[] }) => {
      const created = await tagihanRepository.create(data);
      if (files?.length) {
        await Promise.all(files.map((file) => strukRepository.upload(file, created.id, 'Struk awal')));
      }
      await historyRepository.create({
        tagihan_id: created.id,
        aksi: 'dibuat',
        detail: `Tagihan baru: ${created.barang_nama}`,
      });
      return created;
    },
    onSuccess: (created) => invalidateTagihan(created.id),
  });

  const updateTagihan = useMutation({
    mutationFn: ({ id, ...row }: Partial<Tagihan> & { id: string }) => tagihanRepository.update(id, row),
    onSuccess: async (updated) => {
      await historyRepository.create({
        tagihan_id: updated.id,
        aksi: 'diperbarui',
        detail: 'Data tagihan diperbarui',
      });
      await invalidateTagihan(updated.id);
    },
  });

  const deleteTagihan = useMutation({
    mutationFn: (id: string) => tagihanRepository.delete(id),
    onSuccess: (_, id) => invalidateTagihan(id),
  });

  const correctPayment = useMutation({
    mutationFn: (input: CorrectPaymentInput) => tagihanRepository.correctPayment(input),
    onSuccess: (updated) => invalidateTagihan(updated.id),
  });

  return {
    createTagihan,
    updateTagihan,
    deleteTagihan,
    correctPayment,
    invalidateTagihan,
  };
}
