import { supabase } from '@/integrations/supabase/client';

type AdminFunctionError = Error & { context?: Response };

function getPayloadError(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const error = (data as { error?: unknown }).error;
  return typeof error === 'string' && error.trim() ? error.trim() : null;
}

async function normalizeFunctionError(error: unknown) {
  const fallbackMessage = error instanceof Error ? error.message : 'Admin request failed';
  const response = (error as AdminFunctionError | undefined)?.context;
  if (!response) return new Error(fallbackMessage);

  try {
    const payload = await response.clone().json() as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return new Error(payload.error.trim());
    }
  } catch {
    // Keep fallback message when response body is not JSON.
  }

  return new Error(fallbackMessage);
}

export async function invokeAdminBackup<T = unknown>(payload: Record<string, unknown> | { body: Record<string, unknown> }) {
  const body = 'body' in payload && payload.body ? payload.body : payload;
  const { data, error } = await supabase.functions.invoke<T>('admin-backup', { body });
  if (error) return { data, error: await normalizeFunctionError(error) };

  const payloadError = getPayloadError(data);
  if (payloadError) return { data, error: new Error(payloadError) };

  return { data, error: null };
}
