'use client';

import { formatCurrencyIDR, formatDateID, type TagihanPreviewItem } from '@livoria/core';
import { useActionState } from 'react';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import {
  initialTagihanActionState,
  submitTagihanAction,
} from './tagihan.actions';
import type { TagihanPreviewState } from './tagihan.repository';

type TagihanPreviewShellProps = {
  state: TagihanPreviewState;
};

export function TagihanPreviewShell({ state }: TagihanPreviewShellProps) {
  const [actionState, formAction, isPending] = useActionState(
    submitTagihanAction,
    initialTagihanActionState,
  );
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
          Route ini sudah punya quick pay dan lunasi semua melalui server action. History
          dicatat bersama update tagihan. Struk, laporan, export, dan kalkulator tetap di Vite
          sampai parity test selesai.
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
          state.items.map((item) => (
            <TagihanPreviewCard
              formAction={formAction}
              isPending={isPending}
              item={item}
              key={item.id}
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

function TagihanPreviewCard({
  formAction,
  isPending,
  item,
}: {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  item: TagihanPreviewItem;
}) {
  const defaultDate = new Date().toISOString().slice(0, 10);

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
      {item.status !== 'lunas' ? (
        <>
          <form action={formAction} style={formGridStyle}>
            <input name="intent" type="hidden" value="quick_pay" />
            <input name="id" type="hidden" value={item.id} />
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Jumlah bayar</span>
              <input
                defaultValue={item.cicilan_per_bulan || item.sisa_hutang}
                min={1}
                name="jumlah"
                style={inputStyle}
                type="number"
              />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Tanggal</span>
              <input defaultValue={defaultDate} name="tanggal" style={inputStyle} type="date" />
            </label>
            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <span style={fieldLabelStyle}>Catatan</span>
              <input defaultValue="Quick pay Next preview" name="keterangan" style={inputStyle} />
            </label>
            <button disabled={isPending} style={primaryButtonStyle} type="submit">
              Quick Pay
            </button>
          </form>
          <form action={formAction} style={{ marginTop: theme.spacing.sm }}>
            <input name="intent" type="hidden" value="pay_full" />
            <input name="id" type="hidden" value={item.id} />
            <input name="tanggal" type="hidden" value={defaultDate} />
            <input name="keterangan" type="hidden" value="Lunasi semua Next preview" />
            <button disabled={isPending} style={secondaryButtonStyle} type="submit">
              Lunasi Semua
            </button>
          </form>
        </>
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

const formGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  marginTop: theme.spacing.md,
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
  padding: '10px 12px',
} as const;
