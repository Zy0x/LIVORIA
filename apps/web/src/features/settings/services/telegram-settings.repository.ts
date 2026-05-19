import { supabase } from '@/lib/supabase';

export interface TelegramSubscription {
  chat_id: number;
  is_active: boolean;
  notify_monthly_report: boolean;
  monthly_report_date: number;
  notify_overdue: boolean;
  notify_due_reminder: boolean;
  reminder_days_before: number;
}

type TelegramActionResult = {
  ok?: boolean;
  error?: string;
};

function assertTelegramResult(data: TelegramActionResult | null | undefined, fallback: string) {
  if (!data?.ok) throw new Error(data?.error || fallback);
}

export async function getTelegramSubscription(userId: string) {
  const { data, error } = await supabase
    .from('telegram_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data as TelegramSubscription | null;
}

export async function registerTelegramChat(userId: string, chatId: number) {
  const { data, error } = await supabase.functions.invoke<TelegramActionResult>('telegram-tagihan', {
    body: { action: 'register', userId, chatId },
  });

  if (error) throw error;
  assertTelegramResult(data, 'Gagal menghubungkan');
}

export async function unregisterTelegramChat(userId: string) {
  const { data, error } = await supabase.functions.invoke<TelegramActionResult>('telegram-tagihan', {
    body: { action: 'unregister', userId },
  });

  if (error) throw error;
  assertTelegramResult(data, 'Gagal memutuskan');
}

export async function sendTelegramTestMessage(chatId: number) {
  const { data, error } = await supabase.functions.invoke<TelegramActionResult>('telegram-tagihan', {
    body: { action: 'test', chatId },
  });

  if (error) throw error;
  assertTelegramResult(data, 'Chat ID tidak valid.');
}

export async function updateTelegramPreferences(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<TelegramActionResult>('telegram-tagihan', {
    body: {
      action: 'update_preferences',
      userId,
      ...updates,
    },
  });

  if (error) throw error;
  assertTelegramResult(data, 'Gagal menyimpan');
}
