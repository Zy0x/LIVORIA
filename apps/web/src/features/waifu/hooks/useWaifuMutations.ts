import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseWaifuRepository } from '../services/waifu.repository';
import type { WaifuInput, WaifuItem, WaifuMutationInput } from '../types/waifu.types';
import { WAIFU_QUERY_KEY } from './useWaifuList';

async function withUploadedImage(input: WaifuMutationInput): Promise<WaifuInput> {
  const { imageFile, ...row } = input;
  if (!imageFile) return row;

  const imageUrl = await supabaseWaifuRepository.uploadImage(imageFile);
  return { ...row, image_url: imageUrl };
}

export function useWaifuMutations() {
  const queryClient = useQueryClient();

  const invalidateWaifu = () => queryClient.invalidateQueries({ queryKey: WAIFU_QUERY_KEY });
  const markWaifuStaleInactive = () => void queryClient.invalidateQueries({ queryKey: WAIFU_QUERY_KEY, refetchType: 'inactive' });
  const upsertWaifuCache = (item: WaifuItem) => {
    queryClient.setQueryData<WaifuItem[]>(WAIFU_QUERY_KEY, (current) => {
      if (!current) return [item];
      const index = current.findIndex((waifu) => waifu.id === item.id);
      if (index === -1) return [item, ...current];
      const next = [...current];
      next[index] = item;
      return next;
    });
    markWaifuStaleInactive();
  };
  const removeWaifuCache = (id: string) => {
    queryClient.setQueryData<WaifuItem[]>(WAIFU_QUERY_KEY, (current) => current?.filter((waifu) => waifu.id !== id));
    markWaifuStaleInactive();
  };

  const createWaifu = useMutation({
    mutationFn: async (input: WaifuMutationInput) => supabaseWaifuRepository.create(await withUploadedImage(input)),
    onSuccess: upsertWaifuCache,
  });

  const updateWaifu = useMutation({
    mutationFn: async ({ id, ...input }: WaifuMutationInput & { id: string }) => {
      return supabaseWaifuRepository.update(id, await withUploadedImage(input));
    },
    onSuccess: upsertWaifuCache,
  });

  const deleteWaifu = useMutation({
    mutationFn: (id: string) => supabaseWaifuRepository.delete(id),
    onSuccess: (_, id) => removeWaifuCache(id),
  });

  const importWaifu = useMutation({
    mutationFn: async (items: Array<Partial<WaifuItem>>) => {
      for (const item of items) {
        const { id: _id, user_id: _userId, created_at: _createdAt, ...input } = item;
        await supabaseWaifuRepository.create(input);
      }
    },
    onSuccess: invalidateWaifu,
  });

  return {
    createWaifu,
    updateWaifu,
    deleteWaifu,
    importWaifu,
  };
}
