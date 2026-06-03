/**
 * useTitleLanguage.ts - LIVORIA
 *
 * Hook untuk preferensi bahasa judul per akun.
 * Disimpan di tabel user_preferences di Supabase.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';
import { QUERY_KEYS } from '@/app/query-keys';

export type TitleLang = 'original' | 'english' | 'romaji' | 'native' | 'indonesian';
export type TitleLanguageFlagCode = 'default' | 'gb' | 'jp' | 'cn' | 'id';

export interface TitleLanguageOption {
  value: TitleLang;
  label: string;
  shortLabel: string;
  flag: string;
  flagCode: TitleLanguageFlagCode;
}

export const TITLE_LANG_OPTIONS: TitleLanguageOption[] = [
  { value: 'original', label: 'Resmi/Default', shortLabel: 'Default', flag: 'default', flagCode: 'default' },
  { value: 'english', label: 'Inggris', shortLabel: 'Inggris', flag: 'gb', flagCode: 'gb' },
  { value: 'romaji', label: 'Romaji/Pinyin', shortLabel: 'Romaji', flag: 'jp', flagCode: 'jp' },
  { value: 'native', label: 'Native', shortLabel: 'Native', flag: 'cn', flagCode: 'cn' },
  { value: 'indonesian', label: 'Indonesia', shortLabel: 'Indonesia', flag: 'id', flagCode: 'id' },
];

export function getTitleLanguageOptions(mediaType: 'anime' | 'donghua') {
  return TITLE_LANG_OPTIONS.map((option) => {
    if (option.value === 'romaji') {
      return mediaType === 'anime'
        ? { ...option, label: 'Jepang', shortLabel: 'Jepang', flag: 'jp', flagCode: 'jp' as const }
        : { ...option, label: 'China Pinyin', shortLabel: 'Pinyin', flag: 'cn', flagCode: 'cn' as const };
    }

    if (option.value === 'native') {
      return mediaType === 'anime'
        ? { ...option, label: 'China/Kanji', shortLabel: 'China', flag: 'cn', flagCode: 'cn' as const }
        : { ...option, label: 'China/Kanji', shortLabel: 'China', flag: 'cn', flagCode: 'cn' as const };
    }

    return option;
  });
}

interface UserPreferences {
  anime_title_lang: TitleLang;
  donghua_title_lang: TitleLang;
}

export function useTitleLanguage(mediaType: 'anime' | 'donghua') {
  const queryClient = useQueryClient();

  const { data: prefs } = useQuery({
    queryKey: QUERY_KEYS.USER_PREFERENCES,
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
          { onConflict: 'user_id' },
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PREFERENCES });
    },
  });

  const setLang = useCallback((lang: TitleLang) => {
    updateMut.mutate(lang);
  }, [updateMut]);

  return { currentLang, setLang, isUpdating: updateMut.isPending };
}

/**
 * Resolve judul berdasarkan preferensi bahasa.
 * Mode Romaji/Native/Indonesia tidak boleh fallback ke English, supaya flag
 * bahasa tidak menampilkan bahasa yang salah.
 */
export function resolveTitle(
  originalTitle: string,
  alternativeTitlesJson: string | null | undefined,
  lang: TitleLang,
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

  const preferred = fieldMap[lang]?.trim();
  const english = alt.title_english?.trim();
  const sameAsEnglish = Boolean(preferred && english && preferred.toLowerCase() === english.toLowerCase());
  const asciiOnly = Boolean(preferred && /^[\x00-\x7F\s.,:;!?'"()\-–—&/0-9A-Za-z]+$/.test(preferred));
  if (preferred && (lang === 'english' || (!sameAsEnglish && !(lang === 'native' && asciiOnly)))) return preferred;

  if (lang === 'romaji') {
    const native = alt.title_native?.trim();
    if (native && native !== english && !/^[\x00-\x7F\s.,:;!?'"()\-–—&/0-9A-Za-z]+$/.test(native)) return native;
  }

  if (lang === 'native') {
    const romaji = alt.title_romaji?.trim();
    if (romaji && romaji !== english) return romaji;
  }

  if (lang === 'romaji' || lang === 'native' || lang === 'indonesian') return originalTitle;
  return english || originalTitle;
}
