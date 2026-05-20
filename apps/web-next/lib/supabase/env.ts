export type SupabasePublicEnv = {
  isConfigured: boolean;
  publishableKey: string;
  url: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const fallbackUrl = process.env.VITE_SUPABASE_URL ?? '';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    '';

  return {
    isConfigured: Boolean((url || fallbackUrl) && publishableKey),
    publishableKey,
    url: url || fallbackUrl,
  };
}

export function requireSupabasePublicEnv() {
  const env = getSupabasePublicEnv();
  if (!env.isConfigured) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.');
  }

  return env;
}
