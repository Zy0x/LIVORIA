import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CatatanInput, CatatanItem } from '../types/catatan.types';
import { CATATAN_QUERY_KEY, supabaseCatatanRepository } from '../services/catatan.repository';
import { normalizeCatatanDocument } from '../domain/catatan-content';

export function useCatatanMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: CATATAN_QUERY_KEY });
  const markCatatanStaleInactive = () => void queryClient.invalidateQueries({ queryKey: CATATAN_QUERY_KEY, refetchType: 'inactive' });
  const upsertCatatanCache = (item: CatatanItem) => {
    queryClient.setQueryData<CatatanItem[]>(CATATAN_QUERY_KEY, (current) => {
      if (!current) return [item];
      const index = current.findIndex((catatan) => catatan.id === item.id);
      const withoutItem = index === -1 ? current : current.filter((catatan) => catatan.id !== item.id);
      const next = [item, ...withoutItem];
      return next.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
      });
    });
    markCatatanStaleInactive();
  };
  const removeCatatanCache = (id: string) => {
    queryClient.setQueryData<CatatanItem[]>(CATATAN_QUERY_KEY, (current) => current?.filter((catatan) => catatan.id !== id));
    markCatatanStaleInactive();
  };

  const createCatatan = useMutation({
    mutationFn: (input: CatatanInput) => supabaseCatatanRepository.create(input),
    onSuccess: upsertCatatanCache,
  });

  const updateCatatan = useMutation({
    mutationFn: ({ id, ...input }: CatatanInput & { id: string }) => supabaseCatatanRepository.update(id, input),
    onSuccess: upsertCatatanCache,
  });

  const deleteCatatan = useMutation({
    mutationFn: (id: string) => supabaseCatatanRepository.delete(id),
    onSuccess: (_, id) => removeCatatanCache(id),
  });

  const importCatatan = useMutation({
    mutationFn: async (items: Array<Partial<CatatanItem>>) => {
      for (const item of items) {
        await supabaseCatatanRepository.create({
          title: item.title || 'Catatan',
          content: item.content || '',
          content_doc: normalizeCatatanDocument(item.content_doc, item.content || ''),
          tags: item.tags || [],
          color: item.color || 'sage',
          is_pinned: item.is_pinned || false,
          related_type: item.related_type || null,
          related_id: item.related_id || null,
          related_title: item.related_title || null,
        });
      }
    },
    onSuccess: invalidate,
  });

  return { createCatatan, updateCatatan, deleteCatatan, importCatatan };
}
