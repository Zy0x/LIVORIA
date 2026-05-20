import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

const rootEnvPath = [join(process.cwd(), '..', '..', '.env'), join(process.cwd(), '.env')].find((path) =>
  existsSync(path),
);

if (rootEnvPath) {
  for (const rawLine of readFileSync(rootEnvPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;

    const separator = line.indexOf('=');
    const name = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || process.env[name]) continue;

    const value = line
      .slice(separator + 1)
      .replace(/\s+\/\/.*$/, '')
      .replace(/\s+#.*$/, '')
      .trim()
      .replace(/^['"]|['"]$/g, '');

    process.env[name] = value;
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY,
  },
  transpilePackages: ['@livoria/core', '@livoria/ui-tokens'],
};

export default nextConfig;
