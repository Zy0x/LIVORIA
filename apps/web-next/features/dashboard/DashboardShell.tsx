import { formatCurrencyIDR, type DashboardSummary } from '@livoria/core';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import type { DashboardSummaryState } from './dashboard.repository';

type DashboardShellProps = {
  state: DashboardSummaryState;
};

export function DashboardShell({ state }: DashboardShellProps) {
  const cards = getCards(state.summary);

  return (
    <PreviewShell title="Dashboard Preview">
      <section style={noticeStyle}>
        <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>
          Status: {state.status === 'ready' ? 'Siap' : 'Perlu perhatian'}
        </p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          {state.message}
        </p>
      </section>
      <section style={{
        display: 'grid',
        gap: theme.spacing.md,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        marginTop: theme.spacing.md,
      }}>
        {cards.map(([label, value]) => (
          <article key={label} style={cardStyle}>
            <p style={{ color: theme.colors.muted, margin: 0 }}>{label}</p>
            <strong style={{ display: 'block', fontSize: 30, marginTop: 8 }}>{value}</strong>
          </article>
        ))}
      </section>
      <section style={{ ...cardStyle, marginTop: theme.spacing.md }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Ringkasan Finansial</h2>
        <p style={metricLineStyle}>
          Total dibayar <strong>{formatCurrencyIDR(state.summary.tagihanTotalDibayar)}</strong>
        </p>
        <p style={metricLineStyle}>
          Estimasi keuntungan <strong>{formatCurrencyIDR(state.summary.tagihanTotalKeuntungan)}</strong>
        </p>
        <p style={metricLineStyle}>
          Cicilan/bulan <strong>{formatCurrencyIDR(state.summary.tagihanMonthlyIncome)}</strong>
        </p>
        <p style={{ color: theme.colors.muted, fontSize: 13, marginBottom: 0 }}>
          Sumber data: {state.summary.source || 'preview'}.
        </p>
      </section>
    </PreviewShell>
  );
}

function getCards(summary: DashboardSummary) {
  return [
    ['Tagihan', summary.tagihanCount],
    ['Aktif', summary.tagihanAktifCount],
    ['Anime', summary.animeCount],
    ['Donghua', summary.donghuaCount],
    ['Waifu', summary.waifuCount],
    ['Obat', summary.obatCount],
  ] as const;
}

const noticeStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  padding: theme.spacing.lg,
} as const;

const cardStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  padding: theme.spacing.lg,
} as const;

const metricLineStyle = {
  color: theme.colors.muted,
  lineHeight: 1.6,
} as const;
