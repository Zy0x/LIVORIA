import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type SettingsPreviewState =
  | {
      email: null;
      message: string;
      status: 'unconfigured';
    }
  | {
      email: null;
      message: string;
      status: 'unauthenticated';
    }
  | {
      email: string;
      message: string;
      status: 'ready';
      userId: string;
    }
  | {
      email: null;
      message: string;
      status: 'error';
    };

export async function getSettingsPreview(): Promise<SettingsPreviewState> {
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      email: null,
      message: 'Konfigurasi data publik belum tersedia.',
      status: 'unconfigured',
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
      return {
        email: null,
        message: 'Masuk terlebih dahulu untuk membuka Pengaturan.',
        status: 'unauthenticated',
      };
    }

    return {
      email: user.email ?? '-',
      message: 'Shell Pengaturan siap untuk migrasi panel profile, PWA, backup, dan Telegram.',
      status: 'ready',
      userId: user.id,
    };
  } catch (error) {
    return {
      email: null,
      message: error instanceof Error ? error.message : 'Pengaturan gagal dimuat.',
      status: 'error',
    };
  }
}
