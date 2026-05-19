import { formatCurrencyIDR, type DashboardSummary } from '@livoria/core';
import { PreviewShell } from '../../components/PreviewShell';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { theme } from '../../lib/theme';

const previewSummary: DashboardSummary = {
  animeCount: 0,
  donghuaCount: 0,
  obatCount: 0,
  tagihanCount: 0,
  waifuCount: 0,
};

const cards = [
  ['Tagihan', previewSummary.tagihanCount],
  ['Anime', previewSummary.animeCount],
  ['Donghua', previewSummary.donghuaCount],
  ['Waifu', previewSummary.waifuCount],
  ['Obat', previewSummary.obatCount],
] as const;

export function DashboardShell() {
  const env = getSupabasePublicEnv();

  return (
    <PreviewShell title="Dashboard Preview">
      <section style={{
        display: 'grid',
        gap: theme.spacing.md,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}>
        {cards.map(([label, value]) => (
          <article
            key={label}
            style={{
              background: theme.colors.card,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 12,
              padding: theme.spacing.lg,
            }}
          >
            <p style={{ color: theme.colors.muted, margin: 0 }}>{label}</p>
            <strong style={{ display: 'block', fontSize: 30, marginTop: 8 }}>{value}</strong>
          </article>
        ))}
      </section>
      <section style={{
        background: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 12,
        marginTop: theme.spacing.md,
        padding: theme.spacing.lg,
      }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Status Hybrid</h2>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6 }}>
          Next preview aktif sebagai shell terpisah. Total finansial placeholder:{' '}
          <strong>{formatCurrencyIDR(0)}</strong>.
        </p>
        <p style={{ color: env.isConfigured ? theme.colors.success : theme.colors.warning, marginBottom: 0 }}>
          Supabase public env {env.isConfigured ? 'tersedia' : 'belum tersedia'}.
        </p>
      </section>
    </PreviewShell>
  );
}
