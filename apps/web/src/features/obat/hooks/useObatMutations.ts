import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseObatRepository } from '../services/obat.repository';
import type { ObatInput, ObatItem } from '../types/obat.types';
import { OBAT_QUERY_KEY } from './useObatList';

export function useObatMutations() {
  const queryClient = useQueryClient();

  const invalidateObat = () => queryClient.invalidateQueries({ queryKey: OBAT_QUERY_KEY });
  const markObatStaleInactive = () => void queryClient.invalidateQueries({ queryKey: OBAT_QUERY_KEY, refetchType: 'inactive' });
  const upsertObatCache = (item: ObatItem) => {
    queryClient.setQueryData<ObatItem[]>(OBAT_QUERY_KEY, (current) => {
      if (!current) return [item];
      const index = current.findIndex((obat) => obat.id === item.id);
      if (index === -1) return [item, ...current];
      const next = [...current];
      next[index] = item;
      return next;
    });
    markObatStaleInactive();
  };
  const removeObatCache = (id: string) => {
    queryClient.setQueryData<ObatItem[]>(OBAT_QUERY_KEY, (current) => current?.filter((obat) => obat.id !== id));
    markObatStaleInactive();
  };

  const createObat = useMutation({
    mutationFn: (input: ObatInput) => supabaseObatRepository.create(input),
    onSuccess: upsertObatCache,
  });

  const updateObat = useMutation({
    mutationFn: ({ id, ...input }: ObatInput & { id: string }) => supabaseObatRepository.update(id, input),
    onSuccess: upsertObatCache,
  });

  const deleteObat = useMutation({
    mutationFn: (id: string) => supabaseObatRepository.delete(id),
    onSuccess: (_, id) => removeObatCache(id),
  });

  const importObat = useMutation({
    mutationFn: async (items: Array<Partial<ObatItem>>) => {
      for (const item of items) {
        const { id: _id, user_id: _userId, created_at: _createdAt, ...input } = item;
        await supabaseObatRepository.create(input);
      }
    },
    onSuccess: invalidateObat,
  });

  return {
    createObat,
    updateObat,
    deleteObat,
    importObat,
  };
}
