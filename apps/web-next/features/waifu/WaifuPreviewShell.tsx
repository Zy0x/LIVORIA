'use client';

import { formatDateID, WAIFU_TIERS, type SourceType, type WaifuItem } from '@livoria/core';
import { useActionState, useMemo } from 'react';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import {
  initialWaifuActionState,
  submitWaifuAction,
} from './waifu.actions';
import type { WaifuPreviewState } from './waifu.repository';

type WaifuPreviewShellProps = {
  state: WaifuPreviewState;
};

export function WaifuPreviewShell({ state }: WaifuPreviewShellProps) {
  const [actionState, formAction, isPending] = useActionState(
    submitWaifuAction,
    initialWaifuActionState,
  );
  const canMutate = state.status === 'ready';

  const tierStats = useMemo(() => {
    return WAIFU_TIERS.map((tier) => ({
      count: state.items.filter((item) => item.tier === tier).length,
      tier,
    }));
  }, [state.items]);

  return (
    <PreviewShell eyebrow="Migrasi Bertahap" title="Waifu CRUD Preview">
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

      <section style={statsGridStyle}>
        {tierStats.map((item) => (
          <article key={item.tier} style={panelStyle}>
            <p style={statLabelStyle}>Tier {item.tier}</p>
            <strong style={{ fontSize: 28 }}>{item.count}</strong>
          </article>
        ))}
      </section>

      {canMutate ? (
        <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
          <h2 style={sectionTitleStyle}>Tambah Waifu</h2>
          <WaifuForm
            formAction={formAction}
            isPending={isPending}
            intent="create"
            sourceTitles={state.sourceTitles}
          />
        </section>
      ) : null}

      <section style={cardGridStyle}>
        {state.items.length > 0 ? (
          state.items.map((item) => (
            <WaifuPreviewCard
              formAction={formAction}
              isPending={isPending}
              item={item}
              key={item.id}
              sourceTitles={state.sourceTitles}
            />
          ))
        ) : (
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>Belum ada data ditampilkan</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Route ini sudah siap CRUD dan upload image ketika sesi Supabase aktif. Data kosong
              tetap ditampilkan sebagai state eksplisit agar preview tidak blank.
            </p>
          </article>
        )}
      </section>
    </PreviewShell>
  );
}

function WaifuPreviewCard({
  formAction,
  isPending,
  item,
  sourceTitles,
}: {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  item: WaifuItem;
  sourceTitles: WaifuPreviewState['sourceTitles'];
}) {
  return (
    <article style={panelStyle}>
      {item.image_url ? (
        <img alt={item.name} src={item.image_url} style={imageStyle} />
      ) : (
        <div style={{ ...imageStyle, alignItems: 'center', display: 'flex', justifyContent: 'center' }}>
          Tanpa gambar
        </div>
      )}
      <p style={{ color: theme.colors.primary, fontSize: 13, fontWeight: 800, margin: '12px 0 0' }}>
        Tier {item.tier} / {item.source_type}
      </p>
      <h2 style={{ fontSize: 22, margin: '8px 0' }}>{item.name || 'Tanpa nama'}</h2>
      <p style={{ color: theme.colors.foreground, lineHeight: 1.5, margin: 0 }}>
        {item.source || 'Sumber belum diisi.'}
      </p>
      <p style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>
        {item.notes || 'Tidak ada catatan.'}
      </p>
      {item.created_at ? (
        <p style={{ color: theme.colors.muted, fontSize: 12, marginBottom: 0 }}>
          Dibuat {formatDateID(item.created_at)}
        </p>
      ) : null}
      <details style={{ marginTop: theme.spacing.md }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Edit</summary>
        <WaifuForm
          formAction={formAction}
          isPending={isPending}
          intent="update"
          item={item}
          sourceTitles={sourceTitles}
        />
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

function WaifuForm({
  formAction,
  intent,
  isPending,
  item,
  sourceTitles,
}: {
  formAction: (payload: FormData) => void;
  intent: 'create' | 'update';
  isPending: boolean;
  item?: WaifuItem;
  sourceTitles: WaifuPreviewState['sourceTitles'];
}) {
  return (
    <form action={formAction} encType="multipart/form-data" style={formGridStyle}>
      <input name="intent" type="hidden" value={intent} />
      {item ? <input name="id" type="hidden" value={item.id} /> : null}
      <Field defaultValue={item?.name} label="Nama" name="name" required />
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Tier</span>
        <select defaultValue={item?.tier ?? 'B'} name="tier" style={inputStyle}>
          {WAIFU_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Tipe sumber</span>
        <select defaultValue={item?.source_type ?? 'anime'} name="source_type" style={inputStyle}>
          <option value="anime">Anime</option>
          <option value="donghua">Donghua</option>
        </select>
      </label>
      <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
        <span style={fieldLabelStyle}>Sumber</span>
        <input
          defaultValue={item?.source ?? ''}
          list="waifu-source-titles"
          name="source"
          style={inputStyle}
        />
      </label>
      <datalist id="waifu-source-titles">
        {sourceTitles.map((source) => (
          <option key={`${source.type}:${source.title}`} value={source.title}>
            {getSourceLabel(source.type)}
          </option>
        ))}
      </datalist>
      <Field defaultValue={item?.image_url} label="URL gambar" name="image_url" wide />
      <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
        <span style={fieldLabelStyle}>Upload gambar</span>
        <input accept="image/jpeg,image/png,image/webp,image/gif" name="image_file" style={inputStyle} type="file" />
      </label>
      <Field defaultValue={item?.notes} label="Catatan" name="notes" wide />
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
    <label style={{ ...fieldStyle, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        defaultValue={defaultValue ?? ''}
        name={name}
        required={required}
        style={inputStyle}
      />
    </label>
  );
}

function getStatusLabel(status: WaifuPreviewState['status']) {
  if (status === 'ready') return 'Siap';
  if (status === 'unauthenticated') return 'Perlu login';
  if (status === 'unconfigured') return 'Belum dikonfigurasi';
  return 'Error';
}

function getSourceLabel(type: SourceType) {
  return type === 'donghua' ? 'Donghua' : 'Anime';
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

const statsGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

const statLabelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
  margin: 0,
} as const;

const cardGridStyle = {
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

const imageStyle = {
  aspectRatio: '3 / 4',
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 10,
  color: theme.colors.muted,
  objectFit: 'cover',
  width: '100%',
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
