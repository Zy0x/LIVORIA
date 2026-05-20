import { formatCurrencyIDR, formatDateID, type TagihanPreviewItem } from '@livoria/core';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import type { TagihanPreviewState } from './tagihan.repository';

type TagihanPreviewShellProps = {
  state: TagihanPreviewState;
};

export function TagihanPreviewShell({ state }: TagihanPreviewShellProps) {
  const totalSisa = state.items.reduce((sum, item) => sum + item.sisa_hutang, 0);

  return (
    <PreviewShell eyebrow="Migrasi Bertahap" title="Tagihan Preview">
      <section style={panelStyle}>
        <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>
          Status: {getStatusLabel(state.status)}
        </p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          {state.message}
        </p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          Route ini masih read-only. Quick pay, lunasi semua, history, struk, laporan, export,
          dan kalkulator tetap di Vite sampai server action pembayaran punya regression test.
        </p>
      </section>

      <section style={statsGridStyle}>
        <article style={panelStyle}>
          <p style={statLabelStyle}>Total data</p>
          <strong style={{ fontSize: 28 }}>{state.items.length}</strong>
        </article>
        <article style={panelStyle}>
          <p style={statLabelStyle}>Sisa hutang</p>
          <strong style={{ fontSize: 24 }}>{formatCurrencyIDR(totalSisa)}</strong>
        </article>
      </section>

      <section style={gridStyle}>
        {state.items.length > 0 ? (
          state.items.map((item) => <TagihanPreviewCard item={item} key={item.id} />)
        ) : (
          <article style={panelStyle}>
            <h2 style={{ fontSize: 20, marginTop: 0 }}>Belum ada data ditampilkan</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Empty state eksplisit memastikan route preview tidak blank walau data belum tersedia.
            </p>
          </article>
        )}
      </section>
    </PreviewShell>
  );
}

function TagihanPreviewCard({ item }: { item: TagihanPreviewItem }) {
  return (
    <article style={panelStyle}>
      <p style={{ color: theme.colors.primary, fontSize: 13, fontWeight: 800, margin: 0 }}>
        {item.status}
      </p>
      <h2 style={{ fontSize: 22, margin: '8px 0' }}>{item.debitur_nama || 'Tanpa debitur'}</h2>
      <p style={{ color: theme.colors.foreground, lineHeight: 1.5, margin: 0 }}>
        {item.barang_nama || 'Barang belum diisi.'}
      </p>
      <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
        Hutang {formatCurrencyIDR(item.total_hutang)} / Dibayar {formatCurrencyIDR(item.total_dibayar)}
      </p>
      <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
        Cicilan {formatCurrencyIDR(item.cicilan_per_bulan)} / Sisa {formatCurrencyIDR(item.sisa_hutang)}
      </p>
      {item.tanggal_jatuh_tempo ? (
        <p style={{ color: theme.colors.muted, fontSize: 12, marginBottom: 0 }}>
          Tempo {formatDateID(item.tanggal_jatuh_tempo)}
        </p>
      ) : null}
    </article>
  );
}

function getStatusLabel(status: TagihanPreviewState['status']) {
  if (status === 'ready') return 'Siap';
  if (status === 'unauthenticated') return 'Perlu login';
  if (status === 'unconfigured') return 'Belum dikonfigurasi';
  return 'Error';
}

const panelStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  padding: theme.spacing.lg,
} as const;

const statsGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

const statLabelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
  margin: 0,
} as const;

const gridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  marginTop: theme.spacing.md,
} as const;
