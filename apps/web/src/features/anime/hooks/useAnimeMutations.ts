import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { AnimeItem, WatchStatus } from '@/lib/types';
import { animeRepository } from '../services/anime.repository';
import { buildWatchStatusPayload } from '../domain/watch-status';
import { ANIME_QUERY_KEY } from './useAnimeList';

interface UseAnimeMutationsOptions {
  coverFile: File | null;
  setUploading: (value: boolean) => void;
  onSaved?: () => void;
  onDeleted?: () => void;
  onBatchDeleted?: () => void;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan.';
}

export function useAnimeMutations({
  coverFile,
  setUploading,
  onSaved,
  onDeleted,
  onBatchDeleted,
}: UseAnimeMutationsOptions) {
  const queryClient = useQueryClient();
  const invalidateAnime = () => queryClient.invalidateQueries({ queryKey: ANIME_QUERY_KEY });
  const markAnimeStaleInactive = () => void queryClient.invalidateQueries({ queryKey: ANIME_QUERY_KEY, refetchType: 'inactive' });
  const upsertAnimeCache = (item: AnimeItem) => {
    queryClient.setQueryData<AnimeItem[]>(ANIME_QUERY_KEY, (current) => {
      if (!current) return [item];
      const index = current.findIndex((anime) => anime.id === item.id);
      if (index === -1) return [item, ...current];
      const next = [...current];
      next[index] = item;
      return next;
    });
    markAnimeStaleInactive();
  };
  const removeAnimeCache = (ids: string[]) => {
    queryClient.setQueryData<AnimeItem[]>(ANIME_QUERY_KEY, (current) => {
      if (!current) return current;
      const idsSet = new Set(ids);
      return current.filter((anime) => !idsSet.has(anime.id));
    });
    markAnimeStaleInactive();
  };

  const createMut = useMutation({
    mutationFn: async (row: Partial<AnimeItem>) => {
      let coverUrl = row.cover_url || '';
      if (coverFile) {
        setUploading(true);
        coverUrl = await animeRepository.uploadCover(coverFile);
        setUploading(false);
      }
      return animeRepository.create({ ...row, cover_url: coverUrl || row.cover_url || '' });
    },
    onSuccess: (item) => {
      upsertAnimeCache(item);
      onSaved?.();
      toast({ title: 'Berhasil ditambahkan ✨' });
    },
    onError: (error) => {
      setUploading(false);
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<AnimeItem> & { id: string }) => {
      let coverUrl = row.cover_url || '';
      if (coverFile) {
        setUploading(true);
        coverUrl = await animeRepository.uploadCover(coverFile);
        setUploading(false);
      }
      return animeRepository.update(id, { ...row, cover_url: coverUrl || row.cover_url || '' });
    },
    onSuccess: (item) => {
      upsertAnimeCache(item);
      onSaved?.();
      toast({ title: 'Berhasil diperbarui ✨' });
    },
    onError: (error) => {
      setUploading(false);
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => animeRepository.delete(id),
    onSuccess: (_, id) => {
      removeAnimeCache([id]);
      onDeleted?.();
      toast({ title: 'Dihapus' });
    },
    onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const batchDeleteMut = useMutation({
    mutationFn: (ids: string[]) => animeRepository.deleteMany(ids),
    onSuccess: (_, ids) => {
      removeAnimeCache(ids);
      onBatchDeleted?.();
      toast({ title: `${ids.length} anime berhasil dihapus ✨` });
    },
    onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const toggleFavoriteMut = useMutation({
    mutationFn: (item: AnimeItem) => animeRepository.update(item.id, { is_favorite: !item.is_favorite }),
    onSuccess: upsertAnimeCache,
  });

  const toggleBookmarkMut = useMutation({
    mutationFn: (item: AnimeItem) => animeRepository.update(item.id, { is_bookmarked: !item.is_bookmarked }),
    onSuccess: upsertAnimeCache,
  });

  const updateWatchStatusMut = useMutation({
    mutationFn: ({ item, newStatus }: { item: AnimeItem; newStatus: WatchStatus }) =>
      animeRepository.update(item.id, buildWatchStatusPayload(newStatus)),
    onSuccess: (updatedItem, { newStatus, item }) => {
      upsertAnimeCache(updatedItem);
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
      animeRepository.update(id, {
        episodes_watched,
        ...(episodes !== undefined ? { episodes } : {}),
      }),
    onSuccess: (item, vars) => {
      upsertAnimeCache(item);
      toast({
        title: 'Episode diperbarui',
        description: `Progress: Ep ${vars.episodes_watched}${vars.episodes ? `/${vars.episodes}` : ''}`,
      });
    },
    onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const importItems = async (items: Partial<AnimeItem>[]) => {
    for (const item of items) {
      const { id, user_id, created_at, ...rest } = item;
      void id;
      void user_id;
      void created_at;
      await animeRepository.create(rest);
    }
    invalidateAnime();
    toast({ title: 'Import Berhasil', description: `${items.length} anime diimpor` });
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
    findDuplicates: animeRepository.findDuplicates,
    importItems,
  };
}
