import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseObatRepository } from '../services/obat.repository';
import type { ObatInput, ObatItem } from '../types/obat.types';
import { OBAT_QUERY_KEY } from './useObatList';

export function useObatMutations() {
  const queryClient = useQueryClient();

  const invalidateObat = () => queryClient.invalidateQueries({ queryKey: OBAT_QUERY_KEY });

  const createObat = useMutation({
    mutationFn: (input: ObatInput) => supabaseObatRepository.create(input),
    onSuccess: invalidateObat,
  });

  const updateObat = useMutation({
    mutationFn: ({ id, ...input }: ObatInput & { id: string }) => supabaseObatRepository.update(id, input),
    onSuccess: invalidateObat,
  });

  const deleteObat = useMutation({
    mutationFn: (id: string) => supabaseObatRepository.delete(id),
    onSuccess: invalidateObat,
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
