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

export function useAnimeMutations({
  coverFile,
  setUploading,
  onSaved,
  onDeleted,
  onBatchDeleted,
}: UseAnimeMutationsOptions) {
  const queryClient = useQueryClient();
  const invalidateAnime = () => queryClient.invalidateQueries({ queryKey: ANIME_QUERY_KEY });

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
    onSuccess: () => {
      invalidateAnime();
      onSaved?.();
      toast({ title: 'Berhasil ditambahkan ✨' });
    },
    onError: (error: any) => {
      setUploading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
    onSuccess: () => {
      invalidateAnime();
      onSaved?.();
      toast({ title: 'Berhasil diperbarui ✨' });
    },
    onError: (error: any) => {
      setUploading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => animeRepository.delete(id),
    onSuccess: () => {
      invalidateAnime();
      onDeleted?.();
      toast({ title: 'Dihapus' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const batchDeleteMut = useMutation({
    mutationFn: (ids: string[]) => animeRepository.deleteMany(ids),
    onSuccess: (_, ids) => {
      invalidateAnime();
      onBatchDeleted?.();
      toast({ title: `${ids.length} anime berhasil dihapus ✨` });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const toggleFavoriteMut = useMutation({
    mutationFn: (item: AnimeItem) => animeRepository.update(item.id, { is_favorite: !item.is_favorite }),
    onSuccess: invalidateAnime,
  });

  const toggleBookmarkMut = useMutation({
    mutationFn: (item: AnimeItem) => animeRepository.update(item.id, { is_bookmarked: !item.is_bookmarked }),
    onSuccess: invalidateAnime,
  });

  const updateWatchStatusMut = useMutation({
    mutationFn: ({ item, newStatus }: { item: AnimeItem; newStatus: WatchStatus }) =>
      animeRepository.update(item.id, buildWatchStatusPayload(newStatus) as any),
    onSuccess: (_, { newStatus, item }) => {
      invalidateAnime();
      const statusLabels: Record<WatchStatus, string> = {
        none: 'Penanda dihapus',
        want_to_watch: 'Ditandai: Mau Nonton',
        watching: 'Ditandai: Sedang Nonton',
        watched: 'Ditandai: Sudah Ditonton — akan dihapus dari watchlist dalam 1 jam',
      };
      toast({ title: statusLabels[newStatus], description: item.title });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateEpisodeMut = useMutation({
    mutationFn: ({ id, episodes_watched, episodes }: { id: string; episodes_watched: number; episodes?: number }) =>
      animeRepository.update(id, {
        episodes_watched,
        ...(episodes !== undefined ? { episodes } : {}),
      } as any),
    onSuccess: (_, vars) => {
      invalidateAnime();
      toast({
        title: 'Episode diperbarui',
        description: `Progress: Ep ${vars.episodes_watched}${vars.episodes ? `/${vars.episodes}` : ''}`,
      });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const importItems = async (items: any[]) => {
    for (const item of items) {
      const { id, user_id, created_at, ...rest } = item;
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

