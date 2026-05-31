import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { TELEGRAM_SUBSCRIPTION_SELECT_COLUMNS } from '@/services/query-columns';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type BackupTable = 'anime' | 'donghua' | 'waifu' | 'obat' | 'catatan' | 'tagihan' | 'tagihan_history' | 'struk';

export type SettingsBackupData = {
  _meta: {
    app: 'LIVORIA';
    exported_at: string;
    version: 1;
  };
  data: Record<BackupTable, Record<string, unknown>[]>;
};

export type TelegramSubscriptionPreview = {
  chat_id: number | null;
  is_active: boolean;
  monthly_report_date: number;
  notify_due_reminder: boolean;
  notify_monthly_report: boolean;
  notify_overdue: boolean;
  reminder_days_before: number;
};

export type SettingsPreviewState =
  | {
      backupData: null;
      email: null;
      message: string;
      status: 'unconfigured';
      telegram: null;
    }
  | {
      backupData: null;
      email: null;
      message: string;
      status: 'unauthenticated';
      telegram: null;
    }
  | {
      backupData: SettingsBackupData;
      email: string;
      message: string;
      status: 'ready';
      telegram: TelegramSubscriptionPreview | null;
      userId: string;
    }
  | {
      backupData: null;
      email: null;
      message: string;
      status: 'error';
      telegram: null;
    };

export const BACKUP_TABLES: BackupTable[] = ['anime', 'donghua', 'waifu', 'obat', 'catatan', 'tagihan', 'tagihan_history', 'struk'];

function mapTelegram(row: Record<string, unknown> | null | undefined): TelegramSubscriptionPreview | null {
  if (!row) return null;
  return {
    chat_id: row.chat_id == null ? null : Number(row.chat_id),
    is_active: Boolean(row.is_active),
    monthly_report_date: Number(row.monthly_report_date ?? 1),
    notify_due_reminder: row.notify_due_reminder !== false,
    notify_monthly_report: row.notify_monthly_report !== false,
    notify_overdue: row.notify_overdue !== false,
    reminder_days_before: Number(row.reminder_days_before ?? 3),
  };
}

async function getBackupData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<SettingsBackupData> {
  const entries = await Promise.all(BACKUP_TABLES.map(async (table) => {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).limit(2000);
    if (error) throw error;
    return [table, (data ?? []) as Record<string, unknown>[]] as const;
  }));

  return {
    _meta: {
      app: 'LIVORIA',
      exported_at: new Date().toISOString(),
      version: 1,
    },
    data: Object.fromEntries(entries) as Record<BackupTable, Record<string, unknown>[]>,
  };
}

export async function getSettingsPreview(): Promise<SettingsPreviewState> {
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      backupData: null,
      email: null,
      message: 'Konfigurasi data publik belum tersedia.',
      status: 'unconfigured',
      telegram: null,
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
        backupData: null,
        email: null,
        message: 'Masuk terlebih dahulu untuk membuka Pengaturan.',
        status: 'unauthenticated',
        telegram: null,
      };
    }

    const [backupData, telegramResult] = await Promise.all([
      getBackupData(supabase, user.id),
      supabase.from('telegram_subscriptions').select(TELEGRAM_SUBSCRIPTION_SELECT_COLUMNS).eq('user_id', user.id).maybeSingle(),
    ]);

    if (telegramResult.error && telegramResult.error.code !== 'PGRST116') throw telegramResult.error;

    return {
      backupData,
      email: user.email ?? '-',
      message: 'Pengaturan native siap: profil, theme, backup, Telegram, dan PWA.',
      status: 'ready',
      telegram: mapTelegram(telegramResult.data as Record<string, unknown> | null),
      userId: user.id,
    };
  } catch (error) {
    return {
      backupData: null,
      email: null,
      message: error instanceof Error ? error.message : 'Pengaturan gagal dimuat.',
      status: 'error',
      telegram: null,
    };
  }
}
