import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mobileStorageAdapter } from '../../native/storage';
import { getMobileSupabaseEnv } from './env';

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const env = getMobileSupabaseEnv();
  if (!env.isConfigured) return null;

  client = createClient(env.url, env.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: mobileStorageAdapter,
      storageKey: 'livoria-mobile-auth',
    },
  });

  return client;
}
