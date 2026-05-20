'use client';

import { formatDateID, MEDIA_STATUSES, WATCH_STATUSES, type MediaItem } from '@livoria/core';
import { useActionState } from 'react';
import type { ReactNode } from 'react';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import {
  initialMediaActionState,
  submitMediaAction,
} from './media.actions';
import type { MediaPreviewState } from './media.repository';

type MediaPreviewShellProps = {
  state: MediaPreviewState;
};

export function MediaPreviewShell({ state }: MediaPreviewShellProps) {
  const label = getMediaLabel(state.table);
  const [actionState, formAction, isPending] = useActionState(
    submitMediaAction,
    initialMediaActionState,
  );
  const canMutate = state.status === 'ready';

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
          Route ini sudah punya mutation dasar: tambah, edit, hapus, favorit, bookmark,
          watch status, dan progress episode. Bulk import, AI title, detail kompleks,
          dan export tetap memakai Vite sampai parity test selesai.
        </p>
        {actionState.message ? (
          <p
            style={{
              color: actionState.ok ? theme.colors.success : theme.colors.warning,
              fontWeight: 700,
              marginBottom: 0,
            }}
          >
            {actionState.message}
          </p>
        ) : null}
      </section>

      {canMutate ? (
        <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>Tambah {label}</h2>
          <MediaForm formAction={formAction} intent="create" isPending={isPending} table={state.table} />
        </section>
      ) : null}

      <section style={gridStyle}>
        {state.items.length > 0 ? (
          state.items.map((item) => (
            <MediaPreviewCard
              formAction={formAction}
              isPending={isPending}
              item={item}
              key={item.id}
              table={state.table}
            />
          ))
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

function MediaPreviewCard({
  formAction,
  isPending,
  item,
  table,
}: {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  item: MediaItem;
  table: MediaPreviewState['table'];
}) {
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
      <div style={buttonRowStyle}>
        <QuickMediaAction formAction={formAction} id={item.id} intent="toggle_favorite" isPending={isPending} table={table}>
          {item.is_favorite ? 'Unfavorit' : 'Favorit'}
        </QuickMediaAction>
        <QuickMediaAction formAction={formAction} id={item.id} intent="toggle_bookmark" isPending={isPending} table={table}>
          {item.is_bookmarked ? 'Unbookmark' : 'Bookmark'}
        </QuickMediaAction>
      </div>
      <form action={formAction} style={{ marginTop: theme.spacing.sm }}>
        <input name="intent" type="hidden" value="watch_status" />
        <input name="table" type="hidden" value={table} />
        <input name="id" type="hidden" value={item.id} />
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Status tontonan</span>
          <select defaultValue={item.watch_status ?? 'none'} disabled={isPending} name="watch_status" style={inputStyle}>
            {WATCH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button disabled={isPending} style={{ ...primaryButtonStyle, marginTop: theme.spacing.sm }} type="submit">
          Simpan Status
        </button>
      </form>
      <div style={buttonRowStyle}>
        <ProgressAction direction="decrement" formAction={formAction} id={item.id} isPending={isPending} table={table}>
          - Episode
        </ProgressAction>
        <ProgressAction direction="increment" formAction={formAction} id={item.id} isPending={isPending} table={table}>
          + Episode
        </ProgressAction>
      </div>
      <details style={{ marginTop: theme.spacing.md }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Edit</summary>
        <MediaForm formAction={formAction} intent="update" isPending={isPending} item={item} table={table} />
      </details>
      <form action={formAction} style={{ marginTop: theme.spacing.sm }}>
        <input name="intent" type="hidden" value="delete" />
        <input name="table" type="hidden" value={table} />
        <input name="id" type="hidden" value={item.id} />
        <button disabled={isPending} style={dangerButtonStyle} type="submit">
          Hapus
        </button>
      </form>
    </article>
  );
}

function MediaForm({
  formAction,
  intent,
  isPending,
  item,
  table,
}: {
  formAction: (payload: FormData) => void;
  intent: 'create' | 'update';
  isPending: boolean;
  item?: MediaItem;
  table: MediaPreviewState['table'];
}) {
  return (
    <form action={formAction} style={formGridStyle}>
      <input name="intent" type="hidden" value={intent} />
      <input name="table" type="hidden" value={table} />
      {item ? <input name="id" type="hidden" value={item.id} /> : null}
      <Field defaultValue={item?.title} label="Judul" name="title" required />
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Status rilis</span>
        <select defaultValue={item?.status ?? 'planned'} disabled={isPending} name="status" style={inputStyle}>
          {MEDIA_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <Field defaultValue={item?.genre} label="Genre" name="genre" />
      <Field defaultValue={String(item?.rating ?? 0)} label="Rating" name="rating" type="number" />
      <Field defaultValue={String(item?.episodes ?? 0)} label="Episode" name="episodes" type="number" />
      <Field defaultValue={String(item?.episodes_watched ?? 0)} label="Ditonton" name="episodes_watched" type="number" />
      <Field defaultValue={item?.studio} label="Studio" name="studio" />
      <Field defaultValue={item?.release_year ? String(item.release_year) : ''} label="Tahun" name="release_year" type="number" />
      <Field defaultValue={item?.cover_url} label="Cover URL" name="cover_url" wide />
      <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
        <span style={fieldLabelStyle}>Watch status</span>
        <select defaultValue={item?.watch_status ?? 'none'} disabled={isPending} name="watch_status" style={inputStyle}>
          {WATCH_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <button disabled={isPending} style={primaryButtonStyle} type="submit">
        {intent === 'create' ? 'Tambah' : 'Simpan'}
      </button>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
  type = 'text',
  wide,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
  type?: 'text' | 'number';
  wide?: boolean;
}) {
  return (
    <label style={{ ...fieldStyle, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        defaultValue={defaultValue ?? ''}
        min={type === 'number' ? 0 : undefined}
        name={name}
        required={required}
        style={inputStyle}
        type={type}
      />
    </label>
  );
}

function QuickMediaAction({
  children,
  formAction,
  id,
  intent,
  isPending,
  table,
}: {
  children: ReactNode;
  formAction: (payload: FormData) => void;
  id: string;
  intent: 'toggle_favorite' | 'toggle_bookmark';
  isPending: boolean;
  table: MediaPreviewState['table'];
}) {
  return (
    <form action={formAction}>
      <input name="intent" type="hidden" value={intent} />
      <input name="table" type="hidden" value={table} />
      <input name="id" type="hidden" value={id} />
      <button disabled={isPending} style={secondaryButtonStyle} type="submit">
        {children}
      </button>
    </form>
  );
}

function ProgressAction({
  children,
  direction,
  formAction,
  id,
  isPending,
  table,
}: {
  children: ReactNode;
  direction: 'increment' | 'decrement';
  formAction: (payload: FormData) => void;
  id: string;
  isPending: boolean;
  table: MediaPreviewState['table'];
}) {
  return (
    <form action={formAction}>
      <input name="intent" type="hidden" value="progress" />
      <input name="direction" type="hidden" value={direction} />
      <input name="table" type="hidden" value={table} />
      <input name="id" type="hidden" value={id} />
      <button disabled={isPending} style={secondaryButtonStyle} type="submit">
        {children}
      </button>
    </form>
  );
}

function getStatusLabel(status: MediaPreviewState['status']) {
  if (status === 'ready') return 'Siap';
  if (status === 'unauthenticated') return 'Perlu login';
  if (status === 'unconfigured') return 'Belum dikonfigurasi';
  return 'Error';
}

function getMediaLabel(table: MediaPreviewState['table']) {
  return table === 'donghua' ? 'Donghua' : 'Anime';
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

const formGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
} as const;

const fieldStyle = {
  display: 'grid',
  gap: 6,
} as const;

const fieldLabelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
} as const;

const inputStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  font: 'inherit',
  padding: '10px 12px',
} as const;

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.sm,
  marginTop: theme.spacing.md,
} as const;

const primaryButtonStyle = {
  alignSelf: 'end',
  background: theme.colors.primary,
  border: 0,
  borderRadius: 8,
  color: theme.colors.primaryForeground,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  padding: '11px 14px',
} as const;

const secondaryButtonStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  padding: '9px 12px',
} as const;

const dangerButtonStyle = {
  ...primaryButtonStyle,
  background: '#8c2f2f',
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
