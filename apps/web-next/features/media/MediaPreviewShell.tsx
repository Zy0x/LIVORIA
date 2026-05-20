import { formatDateID, type MediaItem } from '@livoria/core';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import { getMediaLabel, type MediaPreviewState } from './media.repository';

type MediaPreviewShellProps = {
  state: MediaPreviewState;
};

export function MediaPreviewShell({ state }: MediaPreviewShellProps) {
  const label = getMediaLabel(state.table);

  return (
    <PreviewShell eyebrow="Migrasi Bertahap" title={`${label} Preview`}>
      <section style={panelStyle}>
        <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>
          Status: {getStatusLabel(state.status)}
        </p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          {state.message}
        </p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          Route ini masih read-only. Mutation, bulk import, watchlist, favorite/bookmark, dan detail
          tetap memakai Vite sampai parity test selesai.
        </p>
      </section>

      <section style={gridStyle}>
        {state.items.length > 0 ? (
          state.items.map((item) => <MediaPreviewCard item={item} key={item.id} />)
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

function MediaPreviewCard({ item }: { item: MediaItem }) {
  return (
    <article style={panelStyle}>
      {item.cover_url ? (
        <img alt={item.title} src={item.cover_url} style={imageStyle} />
      ) : (
        <div style={{ ...imageStyle, alignItems: 'center', display: 'flex', justifyContent: 'center' }}>
          Tanpa cover
        </div>
      )}
      <p style={{ color: theme.colors.primary, fontSize: 13, fontWeight: 800, margin: '12px 0 0' }}>
        {item.status} / {item.watch_status ?? 'none'}
      </p>
      <h2 style={{ fontSize: 22, margin: '8px 0' }}>{item.title || 'Tanpa judul'}</h2>
      <p style={{ color: theme.colors.foreground, lineHeight: 1.5, margin: 0 }}>
        {item.genre || 'Genre belum diisi.'}
      </p>
      <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
        Episode {item.episodes_watched ?? 0}/{item.episodes ?? '-'} / Rating {item.rating ?? '-'}
      </p>
      {item.studio || item.release_year ? (
        <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
          {item.studio || '-'} {item.release_year ? `(${item.release_year})` : ''}
        </p>
      ) : null}
      {item.created_at ? (
        <p style={{ color: theme.colors.muted, fontSize: 12, marginBottom: 0 }}>
          Dibuat {formatDateID(item.created_at)}
        </p>
      ) : null}
    </article>
  );
}

function getStatusLabel(status: MediaPreviewState['status']) {
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

const gridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

const imageStyle = {
  aspectRatio: '2 / 3',
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 10,
  color: theme.colors.muted,
  objectFit: 'cover',
  width: '100%',
} as const;
