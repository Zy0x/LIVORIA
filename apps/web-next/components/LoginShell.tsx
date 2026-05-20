import { PreviewShell } from './PreviewShell';
import { getSupabasePublicEnv } from '../lib/supabase/env';
import { theme } from '../lib/theme';

export function LoginShell() {
  const env = getSupabasePublicEnv();

  return (
    <PreviewShell eyebrow="Akses Akun" title="Masuk ke LIVORIA">
      <section style={{
        background: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 12,
        maxWidth: 520,
        padding: theme.spacing.lg,
      }}>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginTop: 0 }}>
          Masuk untuk menghubungkan sesi LIVORIA dengan data pribadi, pengaturan,
          dan fitur sinkronisasi Supabase.
        </p>
        <div style={{
          background: env.isConfigured ? '#edf7f0' : '#fff7e6',
          border: `1px solid ${env.isConfigured ? theme.colors.success : theme.colors.warning}`,
          borderRadius: 8,
          color: theme.colors.foreground,
          padding: theme.spacing.md,
        }}>
          Supabase: {env.isConfigured ? 'terkonfigurasi' : 'belum dikonfigurasi'}
        </div>
      </section>
    </PreviewShell>
  );
}
