/**
 * useTitleLanguage.ts — LIVORIA
 *
 * Hook untuk preferensi bahasa judul per akun.
 * Disimpan di tabel user_preferences di Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';

export type TitleLang = 'original' | 'english' | 'romaji' | 'native' | 'indonesian';

export const TITLE_LANG_OPTIONS: { value: TitleLang; label: string; flag: string }[] = [
  { value: 'original',    label: 'Resmi/Default',        flag: '📌' },
  { value: 'english',     label: 'English',              flag: '🇬🇧' },
  { value: 'romaji',      label: 'Jepang/Romaji/Pinyin', flag: '🔤' },
  { value: 'native',      label: 'Kanji/Hanzi/China',    flag: '🈶' },
  { value: 'indonesian',  label: 'Indonesia',            flag: '🇮🇩' },
];

interface UserPreferences {
  anime_title_lang: TitleLang;
  donghua_title_lang: TitleLang;
}

export function useTitleLanguage(mediaType: 'anime' | 'donghua') {
  const queryClient = useQueryClient();

  const { data: prefs } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { anime_title_lang: 'original', donghua_title_lang: 'original' };

      const { data } = await supabase
        .from('user_preferences')
        .select('anime_title_lang, donghua_title_lang')
        .eq('user_id', user.id)
        .single();

      if (data) {
        return {
          anime_title_lang: (data.anime_title_lang as TitleLang) || 'original',
          donghua_title_lang: (data.donghua_title_lang as TitleLang) || 'original',
        };
      }
      return { anime_title_lang: 'original', donghua_title_lang: 'original' };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const currentLang: TitleLang = mediaType === 'anime'
    ? (prefs?.anime_title_lang || 'original')
    : (prefs?.donghua_title_lang || 'original');

  const updateMut = useMutation({
    mutationFn: async (lang: TitleLang) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const field = mediaType === 'anime' ? 'anime_title_lang' : 'donghua_title_lang';

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, [field]: lang, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });

  const setLang = useCallback((lang: TitleLang) => {
    updateMut.mutate(lang);
  }, [updateMut]);

  return { currentLang, setLang, isUpdating: updateMut.isPending };
}

/**
 * Resolve judul berdasarkan preferensi bahasa.
 * Fallback chain: preferred → english → romaji → original title.
 */
export function resolveTitle(
  originalTitle: string,
  alternativeTitlesJson: string | null | undefined,
  lang: TitleLang
): string {
  if (lang === 'original' || !alternativeTitlesJson) return originalTitle;

  const alt = deserializeAlternativeTitles(alternativeTitlesJson);
  if (!alt) return originalTitle;

  const fieldMap: Record<TitleLang, string | undefined> = {
    original: originalTitle,
    english: alt.title_english,
    romaji: alt.title_romaji,
    native: alt.title_native,
    indonesian: alt.title_indonesian,
  };

  // Try preferred language
  const preferred = fieldMap[lang];
  if (preferred?.trim() && preferred !== alt.title_english) return preferred;
  // For Indonesian: do NOT fallback to English — show original instead
  if (lang === 'indonesian') return originalTitle;

  // Fallback for other languages: english → romaji → original
  if (alt.title_english?.trim()) return alt.title_english;
  if (alt.title_romaji?.trim()) return alt.title_romaji;
  return originalTitle;
}
