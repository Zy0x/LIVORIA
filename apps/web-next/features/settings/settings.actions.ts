'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { BACKUP_TABLES, type BackupTable, type SettingsBackupData } from './settings.repository';

export type SettingsActionState = {
  ok: boolean;
  message: string;
};

export const initialSettingsActionState: SettingsActionState = {
  message: '',
  ok: false,
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Masuk terlebih dahulu untuk mengubah Pengaturan.');

  return { supabase, user };
}

async function readBackupFile(formData: FormData): Promise<SettingsBackupData> {
  const file = formData.get('backup_file');
  if (!(file instanceof File) || file.size === 0) throw new Error('File backup belum dipilih.');
  if (file.size > 5 * 1024 * 1024) throw new Error('File backup maksimal 5MB.');

  const parsed = JSON.parse(await file.text()) as unknown;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { _meta?: { app?: unknown } })._meta?.app !== 'LIVORIA' ||
    typeof (parsed as { data?: unknown }).data !== 'object'
  ) {
    throw new Error('File backup bukan format LIVORIA yang valid.');
  }

  return parsed as SettingsBackupData;
}

function sanitizeRows(rows: unknown, table: BackupTable, userId: string) {
  if (!Array.isArray(rows)) return [];
  if (rows.length > 2000) throw new Error(`Import ${table} dibatasi maksimal 2000 baris.`);
  return rows.map((row) => {
    if (typeof row !== 'object' || row === null) throw new Error(`Baris ${table} tidak valid.`);
    return {
      ...(row as Record<string, unknown>),
      user_id: userId,
    };
  });
}

async function invokeTelegramAction(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>('telegram-tagihan', { body });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Aksi Telegram gagal.');
}

export async function submitSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const intent = readString(formData, 'intent');
    const { supabase, user } = await requireUser();

    if (intent === 'import_backup') {
      const backup = await readBackupFile(formData);
      let imported = 0;

      for (const table of BACKUP_TABLES) {
        const rows = sanitizeRows(backup.data?.[table], table, user.id);
        if (rows.length === 0) continue;
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
        imported += rows.length;
      }

      revalidatePath('/settings');
      return { message: `${imported} baris backup berhasil diimpor.`, ok: true };
    }

    if (intent === 'telegram_register') {
      const chatId = Number(readString(formData, 'chat_id'));
      if (!Number.isFinite(chatId)) throw new Error('Chat ID Telegram tidak valid.');
      await invokeTelegramAction(supabase, { action: 'register', chatId, userId: user.id });
      revalidatePath('/settings');
      return { message: 'Chat Telegram terhubung.', ok: true };
    }

    if (intent === 'telegram_unregister') {
      await invokeTelegramAction(supabase, { action: 'unregister', userId: user.id });
      revalidatePath('/settings');
      return { message: 'Chat Telegram diputuskan.', ok: true };
    }

    if (intent === 'telegram_test') {
      const chatId = Number(readString(formData, 'chat_id'));
      if (!Number.isFinite(chatId)) throw new Error('Chat ID Telegram tidak valid.');
      await invokeTelegramAction(supabase, { action: 'test', chatId });
      return { message: 'Pesan test Telegram dikirim.', ok: true };
    }

    if (intent === 'telegram_preferences') {
      await invokeTelegramAction(supabase, {
        action: 'update_preferences',
        monthly_report_date: Number(readString(formData, 'monthly_report_date')) || 1,
        notify_due_reminder: readString(formData, 'notify_due_reminder') === 'on',
        notify_monthly_report: readString(formData, 'notify_monthly_report') === 'on',
        notify_overdue: readString(formData, 'notify_overdue') === 'on',
        reminder_days_before: Number(readString(formData, 'reminder_days_before')) || 3,
        userId: user.id,
      });
      revalidatePath('/settings');
      return { message: 'Preferensi Telegram disimpan.', ok: true };
    }

    throw new Error('Aksi Pengaturan tidak dikenal.');
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Aksi Pengaturan gagal.',
      ok: false,
    };
  }
}
