import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { DonghuaItem, WatchStatus } from '@/lib/types';
import { donghuaRepository } from '../services/donghua.repository';
import { buildWatchStatusPayload } from '../domain/watch-status';
import { DONGHUA_QUERY_KEY } from './useDonghuaList';

interface UseDonghuaMutationsOptions {
  coverFile: File | null;
  setUploading: (value: boolean) => void;
  onSaved?: () => void;
  onDeleted?: () => void;
  onBatchDeleted?: () => void;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan.';
}

export function useDonghuaMutations({
  coverFile,
  setUploading,
  onSaved,
  onDeleted,
  onBatchDeleted,
}: UseDonghuaMutationsOptions) {
  const queryClient = useQueryClient();
  const invalidateDonghua = () => queryClient.invalidateQueries({ queryKey: DONGHUA_QUERY_KEY });
  const markDonghuaStaleInactive = () => void queryClient.invalidateQueries({ queryKey: DONGHUA_QUERY_KEY, refetchType: 'inactive' });
  const upsertDonghuaCache = (item: DonghuaItem) => {
    queryClient.setQueryData<DonghuaItem[]>(DONGHUA_QUERY_KEY, (current) => {
      if (!current) return [item];
      const index = current.findIndex((donghua) => donghua.id === item.id);
      if (index === -1) return [item, ...current];
      const next = [...current];
      next[index] = item;
      return next;
    });
    markDonghuaStaleInactive();
  };
  const removeDonghuaCache = (ids: string[]) => {
    queryClient.setQueryData<DonghuaItem[]>(DONGHUA_QUERY_KEY, (current) => {
      if (!current) return current;
      const idsSet = new Set(ids);
      return current.filter((donghua) => !idsSet.has(donghua.id));
    });
    markDonghuaStaleInactive();
  };

  const createMut = useMutation({
    mutationFn: async (row: Partial<DonghuaItem>) => {
      let coverUrl = row.cover_url || '';
      if (coverFile) {
        setUploading(true);
        coverUrl = await donghuaRepository.uploadCover(coverFile);
        setUploading(false);
      }
      return donghuaRepository.create({ ...row, cover_url: coverUrl || row.cover_url || '' });
    },
    onSuccess: (item) => {
      upsertDonghuaCache(item);
      onSaved?.();
      toast({ title: 'Berhasil ditambahkan ✨' });
    },
    onError: (error) => {
      setUploading(false);
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<DonghuaItem> & { id: string }) => {
      let coverUrl = row.cover_url || '';
      if (coverFile) {
        setUploading(true);
        coverUrl = await donghuaRepository.uploadCover(coverFile);
        setUploading(false);
      }
      return donghuaRepository.update(id, { ...row, cover_url: coverUrl || row.cover_url || '' });
    },
    onSuccess: (item) => {
      upsertDonghuaCache(item);
      onSaved?.();
      toast({ title: 'Berhasil diperbarui ✨' });
    },
    onError: (error) => {
      setUploading(false);
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => donghuaRepository.delete(id),
    onSuccess: (_, id) => {
      removeDonghuaCache([id]);
      onDeleted?.();
      toast({ title: 'Dihapus' });
    },
    onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const batchDeleteMut = useMutation({
    mutationFn: (ids: string[]) => donghuaRepository.deleteMany(ids),
    onSuccess: (_, ids) => {
      removeDonghuaCache(ids);
      onBatchDeleted?.();
      toast({ title: `${ids.length} donghua berhasil dihapus ✨` });
    },
    onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const toggleFavoriteMut = useMutation({
    mutationFn: (item: DonghuaItem) => donghuaRepository.update(item.id, { is_favorite: !item.is_favorite }),
    onSuccess: upsertDonghuaCache,
  });

  const toggleBookmarkMut = useMutation({
    mutationFn: (item: DonghuaItem) => donghuaRepository.update(item.id, { is_bookmarked: !item.is_bookmarked }),
    onSuccess: upsertDonghuaCache,
  });

  const updateWatchStatusMut = useMutation({
    mutationFn: ({ item, newStatus }: { item: DonghuaItem; newStatus: WatchStatus }) =>
      donghuaRepository.update(item.id, buildWatchStatusPayload(newStatus)),
    onSuccess: (updatedItem, { newStatus, item }) => {
      upsertDonghuaCache(updatedItem);
      const statusLabels: Record<WatchStatus, string> = {
        none: 'Penanda dihapus',
        want_to_watch: 'Ditandai: Mau Nonton',
        watching: 'Ditandai: Sedang Nonton',
        watched: 'Ditandai: Sudah Ditonton — akan dihapus dari watchlist dalam 1 jam',
      };
      toast({ title: statusLabels[newStatus], description: item.title });
    },
    onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const updateEpisodeMut = useMutation({
    mutationFn: ({ id, episodes_watched, episodes }: { id: string; episodes_watched: number; episodes?: number }) =>
      donghuaRepository.update(id, {
        episodes_watched,
        ...(episodes !== undefined ? { episodes } : {}),
      }),
    onSuccess: (item, vars) => {
      upsertDonghuaCache(item);
      toast({
        title: 'Episode diperbarui',
        description: `Progress: Ep ${vars.episodes_watched}${vars.episodes ? `/${vars.episodes}` : ''}`,
      });
    },
    onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const importItems = async (items: Partial<DonghuaItem>[]) => {
    for (const item of items) {
      const { id, user_id, created_at, ...rest } = item;
      void id;
      void user_id;
      void created_at;
      await donghuaRepository.create(rest);
    }
    invalidateDonghua();
    toast({ title: 'Import Berhasil', description: `${items.length} donghua diimpor` });
  };

  return {
    createMut,
    updateMut,
    deleteMut,
    batchDeleteMut,
    toggleFavoriteMut,
    toggleBookmarkMut,
    updateWatchStatusMut,
    updateEpisodeMut,
    findDuplicates: donghuaRepository.findDuplicates,
    importItems,
  };
}
