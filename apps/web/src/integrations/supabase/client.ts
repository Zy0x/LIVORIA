import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_VITE_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'livoria-auth',
  },
});
