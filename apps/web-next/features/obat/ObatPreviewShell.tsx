import { formatDateID, type ObatItem } from '@livoria/core';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import type { ObatPreviewState } from './obat.repository';

type ObatPreviewShellProps = {
  state: ObatPreviewState;
};

export function ObatPreviewShell({ state }: ObatPreviewShellProps) {
  return (
    <PreviewShell eyebrow="Migrasi Bertahap" title="Obat Preview">
      <section style={panelStyle}>
        <div>
          <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>
            Status: {getStatusLabel(state.status)}
          </p>
          <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
            {state.message}
          </p>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: theme.spacing.md,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          marginTop: theme.spacing.md,
        }}
      >
        {state.items.length > 0 ? (
          state.items.map((item) => <ObatPreviewCard item={item} key={item.id} />)
        ) : (
          <article style={panelStyle}>
            <h2 style={{ fontSize: 20, margin: 0 }}>Belum ada data ditampilkan</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Route ini sengaja dibuat read-only sebagai batu loncatan sebelum CRUD Obat dipindahkan
              penuh ke Next.
            </p>
          </article>
        )}
      </section>
    </PreviewShell>
  );
}

function ObatPreviewCard({ item }: { item: ObatItem }) {
  return (
    <article style={panelStyle}>
      <p style={{ color: theme.colors.muted, fontSize: 13, fontWeight: 700, margin: 0 }}>
        {item.type || 'Lainnya'}
      </p>
      <h2 style={{ fontSize: 22, margin: '8px 0' }}>{item.name || 'Tanpa nama'}</h2>
      <p style={{ color: theme.colors.foreground, lineHeight: 1.5, margin: 0 }}>
        {item.dosage || '-'} · {item.frequency || '-'}
      </p>
      <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
        {item.usage_info || 'Tidak ada aturan pakai.'}
      </p>
      {item.created_at ? (
        <p style={{ color: theme.colors.muted, fontSize: 12, marginBottom: 0 }}>
          Dibuat {formatDateID(item.created_at)}
        </p>
      ) : null}
    </article>
  );
}

function getStatusLabel(status: ObatPreviewState['status']) {
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
