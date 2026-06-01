import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CatatanInput, CatatanItem } from '../types/catatan.types';
import { CATATAN_QUERY_KEY, supabaseCatatanRepository } from '../services/catatan.repository';
import { normalizeCatatanDocument } from '../domain/catatan-content';

export function useCatatanMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: CATATAN_QUERY_KEY });

  const createCatatan = useMutation({
    mutationFn: (input: CatatanInput) => supabaseCatatanRepository.create(input),
    onSuccess: invalidate,
  });

  const updateCatatan = useMutation({
    mutationFn: ({ id, ...input }: CatatanInput & { id: string }) => supabaseCatatanRepository.update(id, input),
    onSuccess: invalidate,
  });

  const deleteCatatan = useMutation({
    mutationFn: (id: string) => supabaseCatatanRepository.delete(id),
    onSuccess: invalidate,
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
