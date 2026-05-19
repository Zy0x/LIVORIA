import { PreviewShell } from './PreviewShell';
import { getSupabasePublicEnv } from '../lib/supabase/env';
import { theme } from '../lib/theme';

export function LoginShell() {
  const env = getSupabasePublicEnv();

  return (
    <PreviewShell eyebrow="Auth Shell" title="Masuk ke LIVORIA">
      <section style={{
        background: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 12,
        maxWidth: 520,
        padding: theme.spacing.lg,
      }}>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginTop: 0 }}>
          Shell login Next.js untuk validasi routing, token theme, dan konfigurasi Supabase.
          Form auth penuh tetap berada di aplikasi Vite sampai migrasi disetujui.
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
