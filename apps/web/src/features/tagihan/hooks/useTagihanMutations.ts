import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Tagihan } from '../types/tagihan.types';
import { historyRepository } from '../services/history.repository';
import { strukRepository } from '../services/struk.repository';
import { tagihanRepository, type CorrectPaymentInput } from '../services/tagihan.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export function useTagihanMutations() {
  const queryClient = useQueryClient();

  const markTagihanStaleInactive = () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN, refetchType: 'inactive' });
  const upsertTagihanCache = (item: Tagihan) => {
    queryClient.setQueryData<Tagihan[]>(QUERY_KEYS.TAGIHAN, (current) => {
      if (!current) return [item];
      const index = current.findIndex((tagihan) => tagihan.id === item.id);
      if (index === -1) return [item, ...current];
      const next = [...current];
      next[index] = item;
      return next;
    });
    markTagihanStaleInactive();
  };
  const removeTagihanCache = (id: string) => {
    queryClient.setQueryData<Tagihan[]>(QUERY_KEYS.TAGIHAN, (current) => current?.filter((tagihan) => tagihan.id !== id));
    markTagihanStaleInactive();
  };

  const invalidateRelated = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
    if (id) {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN_HISTORY(id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN_STRUK(id) });
    }
  };

  const invalidateTagihan = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN });
    await invalidateRelated(id);
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
    onSuccess: async (created) => {
      upsertTagihanCache(created);
      await invalidateRelated(created.id);
    },
  });

  const updateTagihan = useMutation({
    mutationFn: ({ id, ...row }: Partial<Tagihan> & { id: string }) => tagihanRepository.update(id, row),
    onSuccess: async (updated) => {
      await historyRepository.create({
        tagihan_id: updated.id,
        aksi: 'diperbarui',
        detail: 'Data tagihan diperbarui',
      });
      upsertTagihanCache(updated);
      await invalidateRelated(updated.id);
    },
  });

  const deleteTagihan = useMutation({
    mutationFn: (id: string) => tagihanRepository.delete(id),
    onSuccess: async (_, id) => {
      removeTagihanCache(id);
      await invalidateRelated(id);
    },
  });

  const correctPayment = useMutation({
    mutationFn: (input: CorrectPaymentInput) => tagihanRepository.correctPayment(input),
    onSuccess: async (updated) => {
      upsertTagihanCache(updated);
      await invalidateRelated(updated.id);
    },
  });

  return {
    createTagihan,
    updateTagihan,
    deleteTagihan,
    correctPayment,
    invalidateTagihan,
  };
}
