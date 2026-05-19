import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type ThemeType = 'light' | 'dark' | 'system';

export function useThemePreference() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: themePref, isLoading } = useQuery({
    queryKey: ['user-theme-preference', user?.id],
    queryFn: async (): Promise<ThemeType> => {
      if (!user) return (localStorage.getItem('livoria-theme') as ThemeType) || 'system';

      const { data, error } = await supabase
        .from('user_preferences')
        .select('theme')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return (localStorage.getItem('livoria-theme') as ThemeType) || 'system';
      return (data.theme as ThemeType) || 'system';
    },
    staleTime: Infinity,
  });

  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: ThemeType) => {
      localStorage.setItem('livoria-theme', newTheme);
      
      if (!user) return;

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { 
            user_id: user.id, 
            theme: newTheme, 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
    },
    onSuccess: (_, newTheme) => {
      queryClient.setQueryData(['user-theme-preference', user?.id], newTheme);
    },
  });

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    const effectiveTheme = themePref === 'system' || !themePref
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : themePref;

    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
  }, [themePref]);

  return {
    theme: themePref || 'system',
    setTheme: (newTheme: ThemeType) => updateThemeMutation.mutate(newTheme),
    isLoading,
    isUpdating: updateThemeMutation.isPending
  };
}
