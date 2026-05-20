'use client';

import type { ObatItem } from '@livoria/core';
import { useActionState, useMemo, useState } from 'react';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import { ObatCard } from './components/ObatCard';
import { ObatDetailDialog } from './components/ObatDetailDialog';
import { ObatFilterBar } from './components/ObatFilterBar';
import { ObatForm } from './components/ObatForm';
import { ObatImportExport } from './components/ObatImportExport';
import { ObatPagination } from './components/ObatPagination';
import { ObatStats } from './components/ObatStats';
import {
  cardGridStyle,
  panelStyle,
  sectionTitleStyle,
} from './components/obat.styles';
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
  const [detailItem, setDetailItem] = useState<ObatItem | null>(null);
  const canMutate = state.status === 'ready';

  const exportHref = useMemo(() => {
    if (state.status !== 'ready') return '';
    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(state.items, null, 2))}`;
  }, [state]);

  return (
    <PreviewShell eyebrow="Kesehatan" title="Obat">
      <section style={panelStyle}>
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
      </section>

      {state.status === 'ready' ? (
        <>
          <ObatStats stats={state.stats} />
          <ObatFilterBar query={state.query} typeOptions={state.typeOptions} />
          <ObatImportExport exportHref={exportHref} formAction={formAction} isPending={isPending} />
        </>
      ) : null}

      {canMutate ? (
        <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
          <h2 style={sectionTitleStyle}>Tambah Obat</h2>
          <ObatForm formAction={formAction} isPending={isPending} intent="create" />
        </section>
      ) : null}

      <div id="obat-list" style={{ scrollMarginTop: 24 }} />
      <section style={cardGridStyle}>
        {state.items.length > 0 ? (
          state.items.map((item) => (
            <ObatCard
              formAction={formAction}
              isPending={isPending}
              item={item}
              key={item.id}
              onDetail={() => setDetailItem(item)}
            />
          ))
        ) : (
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>Belum ada data ditampilkan</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Belum ada obat yang cocok dengan filter saat ini.
            </p>
          </article>
        )}
      </section>

      {state.status === 'ready' ? <ObatPagination state={state} /> : null}
      <ObatDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
    </PreviewShell>
  );
}

function getStatusLabel(status: ObatPreviewState['status']) {
  if (status === 'ready') return 'Siap';
  if (status === 'unauthenticated') return 'Perlu login';
  if (status === 'unconfigured') return 'Belum dikonfigurasi';
  return 'Error';
}
