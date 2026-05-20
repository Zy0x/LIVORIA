import Link from 'next/link';
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
    <PreviewShell title="Dashboard">
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
          Sumber data: {state.summary.source || 'ringkasan'}.
        </p>
        <Link href="/tagihan#tagihan-list" style={linkButtonStyle}>
          Buka Quick Pay
        </Link>
      </section>
      <section style={twoColumnStyle}>
        <article style={cardStyle}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>Tagihan Terbaru</h2>
          {state.recentTagihan.length > 0 ? state.recentTagihan.map((item) => (
            <Link href="/tagihan#tagihan-list" key={item.id} style={rowLinkStyle}>
              <strong>{item.debitur_nama || 'Tanpa debitur'}</strong>
              <span>{item.barang_nama || '-'} / {formatCurrencyIDR(item.sisa_hutang)}</span>
            </Link>
          )) : (
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>Belum ada tagihan terbaru.</p>
          )}
        </article>
        <article style={cardStyle}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>Media Terbaru</h2>
          {state.recentMedia.length > 0 ? state.recentMedia.map((item) => (
            <Link href={item.genre.toLowerCase().includes('donghua') ? '/donghua#media-list' : '/anime#media-list'} key={item.id} style={rowLinkStyle}>
              <strong>{item.title || 'Tanpa judul'}</strong>
              <span>{item.status} / {item.watch_status ?? 'none'}</span>
            </Link>
          )) : (
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>Belum ada media terbaru.</p>
          )}
        </article>
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

const twoColumnStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

const linkButtonStyle = {
  background: theme.colors.primary,
  borderRadius: 8,
  color: theme.colors.primaryForeground,
  display: 'inline-flex',
  fontWeight: 800,
  marginTop: theme.spacing.sm,
  minHeight: 44,
  padding: '11px 14px',
} as const;

const rowLinkStyle = {
  borderTop: `1px solid ${theme.colors.border}`,
  display: 'grid',
  gap: 4,
  padding: '10px 0',
} as const;
