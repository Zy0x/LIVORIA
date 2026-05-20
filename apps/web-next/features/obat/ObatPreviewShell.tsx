'use client';

import { formatDateID, type ObatItem } from '@livoria/core';
import { useActionState } from 'react';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import {
  initialObatActionState,
  submitObatAction,
} from './obat.actions';
import type { ObatPreviewState } from './obat.repository';

type ObatPreviewShellProps = {
  state: ObatPreviewState;
};

export function ObatPreviewShell({ state }: ObatPreviewShellProps) {
  const [actionState, formAction, isPending] = useActionState(
    submitObatAction,
    initialObatActionState,
  );
  const canMutate = state.status === 'ready';

  return (
    <PreviewShell eyebrow="Migrasi Bertahap" title="Obat CRUD Preview">
      <section style={panelStyle}>
        <div>
          <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>
            Status: {getStatusLabel(state.status)}
          </p>
          <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
            {state.message}
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
        </div>
      </section>

      {canMutate ? (
        <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
          <h2 style={sectionTitleStyle}>Tambah Obat</h2>
          <ObatForm formAction={formAction} isPending={isPending} intent="create" />
        </section>
      ) : null}

      <section
        style={{
          display: 'grid',
          gap: theme.spacing.md,
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          marginTop: theme.spacing.md,
        }}
      >
        {state.items.length > 0 ? (
          state.items.map((item) => (
            <ObatPreviewCard
              formAction={formAction}
              isPending={isPending}
              item={item}
              key={item.id}
            />
          ))
        ) : (
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>Belum ada data ditampilkan</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Route ini sudah siap CRUD ketika sesi Supabase aktif. Data kosong tetap ditampilkan
              sebagai state yang eksplisit agar preview tidak blank.
            </p>
          </article>
        )}
      </section>
    </PreviewShell>
  );
}

function ObatPreviewCard({
  formAction,
  isPending,
  item,
}: {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  item: ObatItem;
}) {
  return (
    <article style={panelStyle}>
      <p style={{ color: theme.colors.muted, fontSize: 13, fontWeight: 700, margin: 0 }}>
        {item.type || 'Lainnya'}
      </p>
      <h2 style={{ fontSize: 22, margin: '8px 0' }}>{item.name || 'Tanpa nama'}</h2>
      <p style={{ color: theme.colors.foreground, lineHeight: 1.5, margin: 0 }}>
        {item.dosage || '-'} / {item.frequency || '-'}
      </p>
      <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
        {item.usage_info || 'Tidak ada aturan pakai.'}
      </p>
      {item.created_at ? (
        <p style={{ color: theme.colors.muted, fontSize: 12, marginBottom: 0 }}>
          Dibuat {formatDateID(item.created_at)}
        </p>
      ) : null}
      <details style={{ marginTop: theme.spacing.md }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Edit</summary>
        <ObatForm formAction={formAction} isPending={isPending} intent="update" item={item} />
      </details>
      <form action={formAction} style={{ marginTop: theme.spacing.sm }}>
        <input name="intent" type="hidden" value="delete" />
        <input name="id" type="hidden" value={item.id} />
        <button disabled={isPending} style={dangerButtonStyle} type="submit">
          Hapus
        </button>
      </form>
    </article>
  );
}

function ObatForm({
  formAction,
  intent,
  isPending,
  item,
}: {
  formAction: (payload: FormData) => void;
  intent: 'create' | 'update';
  isPending: boolean;
  item?: ObatItem;
}) {
  return (
    <form action={formAction} style={formGridStyle}>
      <input name="intent" type="hidden" value={intent} />
      {item ? <input name="id" type="hidden" value={item.id} /> : null}
      <Field defaultValue={item?.name} label="Nama" name="name" required />
      <Field defaultValue={item?.type || 'Lainnya'} label="Tipe" name="type" />
      <Field defaultValue={item?.dosage} label="Dosis" name="dosage" />
      <Field defaultValue={item?.frequency} label="Frekuensi" name="frequency" />
      <Field defaultValue={item?.usage_info} label="Aturan pakai" name="usage_info" wide />
      <Field defaultValue={item?.side_effects ?? ''} label="Efek samping" name="side_effects" wide />
      <Field defaultValue={item?.notes ?? ''} label="Catatan" name="notes" wide />
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
  wide,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 6, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={{ color: theme.colors.muted, fontSize: 13, fontWeight: 800 }}>{label}</span>
      <input
        defaultValue={defaultValue ?? ''}
        name={name}
        required={required}
        style={inputStyle}
      />
    </label>
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

const sectionTitleStyle = {
  fontSize: 20,
  marginTop: 0,
} as const;

const formGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
} as const;

const inputStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  font: 'inherit',
  padding: '10px 12px',
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

const dangerButtonStyle = {
  ...primaryButtonStyle,
  background: '#8c2f2f',
} as const;
