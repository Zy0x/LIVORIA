'use client';

import { formatCurrencyIDR, formatDateID } from '@livoria/core';
import { useActionState, useMemo, useState } from 'react';
import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import {
  initialTagihanActionState,
  submitTagihanAction,
} from './tagihan.actions';
import type { TagihanItem, TagihanPreviewState } from './tagihan.repository';

type TagihanPreviewShellProps = {
  state: TagihanPreviewState;
};

export function TagihanPreviewShell({ state }: TagihanPreviewShellProps) {
  const [selectedItem, setSelectedItem] = useState<TagihanItem | null>(null);
  const [calculator, setCalculator] = useState({ bunga: 10, harga: 1000000, tenor: 10 });
  const [actionState, formAction, isPending] = useActionState(
    submitTagihanAction,
    initialTagihanActionState,
  );
  const canMutate = state.status === 'ready';
  const exportHref = useMemo(() => {
    if (state.status !== 'ready') return '';
    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(state.exportItems, null, 2))}`;
  }, [state]);
  const calculatorTotal = calculator.harga + (calculator.harga * calculator.bunga / 100);
  const calculatorMonthly = Math.ceil(calculatorTotal / Math.max(1, calculator.tenor));

  return (
    <PreviewShell eyebrow="Keuangan" title="Tagihan">
      <section style={panelStyle}>
        <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>
          Status: {getStatusLabel(state.status)}
        </p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          {state.message}
        </p>
        {actionState.message ? (
          <p style={{
            color: actionState.ok ? theme.colors.success : theme.colors.warning,
            fontWeight: 700,
            marginBottom: 0,
          }}>
            {actionState.message}
          </p>
        ) : null}
      </section>

      {state.status === 'ready' ? (
        <>
          <TagihanStats state={state} />
          <TagihanFilterBar state={state} />
          <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
            <h2 style={sectionTitleStyle}>Laporan dan Export</h2>
            <div style={statsGridStyle}>
              <Metric label="Total hutang" value={formatCurrencyIDR(state.report.totalHutang)} />
              <Metric label="Sisa hutang" value={formatCurrencyIDR(state.report.totalSisa)} />
              <Metric label="Total dibayar" value={formatCurrencyIDR(state.report.totalDibayar)} />
              <Metric label="Keuntungan" value={formatCurrencyIDR(state.report.totalKeuntungan)} />
            </div>
            <a download="tagihan-livoria.json" href={exportHref} style={secondaryLinkStyle}>Export JSON</a>
          </section>
          <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
            <h2 style={sectionTitleStyle}>Kalkulator</h2>
            <div style={formGridStyle}>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Harga</span>
                <input min={0} onChange={(event) => setCalculator((prev) => ({ ...prev, harga: Number(event.target.value) || 0 }))} style={inputStyle} type="number" value={calculator.harga} />
              </label>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Bunga %</span>
                <input min={0} onChange={(event) => setCalculator((prev) => ({ ...prev, bunga: Number(event.target.value) || 0 }))} style={inputStyle} type="number" value={calculator.bunga} />
              </label>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Tenor</span>
                <input min={1} onChange={(event) => setCalculator((prev) => ({ ...prev, tenor: Number(event.target.value) || 1 }))} style={inputStyle} type="number" value={calculator.tenor} />
              </label>
              <Metric label="Cicilan/bulan" value={formatCurrencyIDR(calculatorMonthly)} />
            </div>
          </section>
        </>
      ) : null}

      {canMutate ? (
        <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
          <h2 style={sectionTitleStyle}>Tambah Tagihan</h2>
          <TagihanForm formAction={formAction} intent="create" isPending={isPending} />
        </section>
      ) : null}

      <div id="tagihan-list" style={{ scrollMarginTop: 24 }} />
      <section style={gridStyle}>
        {state.items.length > 0 ? (
          state.items.map((item) => (
            <TagihanPreviewCard
              formAction={formAction}
              histories={state.histories.filter((history) => history.tagihan_id === item.id)}
              isPending={isPending}
              item={item}
              key={item.id}
              onDetail={() => setSelectedItem(item)}
              struk={state.struk.filter((struk) => struk.tagihan_id === item.id)}
            />
          ))
        ) : (
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>Belum ada data ditampilkan</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Belum ada tagihan yang cocok dengan filter saat ini.
            </p>
          </article>
        )}
      </section>

      {state.status === 'ready' ? <TagihanPagination state={state} /> : null}
      <TagihanDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
    </PreviewShell>
  );
}

function TagihanStats({ state }: { state: Extract<TagihanPreviewState, { status: 'ready' }> }) {
  return (
    <section style={statsGridStyle}>
      <Metric label="Aktif" value={state.report.aktifCount} />
      <Metric label="Overdue" value={state.report.overdueCount} />
      <Metric label="Lunas" value={state.report.lunasCount} />
      <Metric label="Sisa" value={formatCurrencyIDR(state.report.totalSisa)} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article style={panelStyle}>
      <p style={statLabelStyle}>{label}</p>
      <strong style={{ display: 'block', fontSize: 24, marginTop: 6 }}>{value}</strong>
    </article>
  );
}

function TagihanFilterBar({ state }: { state: Extract<TagihanPreviewState, { status: 'ready' }> }) {
  return (
    <form action="/tagihan#tagihan-list" method="get" style={{ ...panelStyle, ...formGridStyle, marginTop: theme.spacing.md }}>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Cari</span>
        <input defaultValue={state.query.search} name="search" placeholder="Debitur, barang, kontak..." style={inputStyle} />
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Status</span>
        <select defaultValue={state.query.status} name="status" style={inputStyle}>
          <option value="all">Semua</option>
          <option value="aktif">Aktif</option>
          <option value="lunas">Lunas</option>
          <option value="overdue">Overdue</option>
          <option value="ditunda">Ditunda</option>
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Urutkan</span>
        <select defaultValue={state.query.sort} name="sort" style={inputStyle}>
          <option value="terbaru">Terbaru</option>
          <option value="debitur">Debitur</option>
          <option value="tempo">Tempo</option>
          <option value="sisa">Sisa terbesar</option>
        </select>
      </label>
      <input name="page" type="hidden" value="1" />
      <input name="pageSize" type="hidden" value={state.pageSize} />
      <button style={primaryButtonStyle} type="submit">Terapkan</button>
    </form>
  );
}

function TagihanPreviewCard({
  formAction,
  histories,
  isPending,
  item,
  onDetail,
  struk,
}: {
  formAction: (payload: FormData) => void;
  histories: Extract<TagihanPreviewState, { status: 'ready' }>['histories'];
  isPending: boolean;
  item: TagihanItem;
  onDetail: () => void;
  struk: Extract<TagihanPreviewState, { status: 'ready' }>['struk'];
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
      <p style={helperTextStyle}>
        Hutang {formatCurrencyIDR(item.total_hutang)} / Dibayar {formatCurrencyIDR(item.total_dibayar)}
      </p>
      <p style={helperTextStyle}>
        Cicilan {formatCurrencyIDR(item.cicilan_per_bulan)} / Sisa {formatCurrencyIDR(item.sisa_hutang)}
      </p>
      {item.tanggal_jatuh_tempo ? <p style={helperTextStyle}>Tempo {formatDateID(item.tanggal_jatuh_tempo)}</p> : null}
      <div style={buttonRowStyle}>
        <button onClick={onDetail} style={secondaryButtonStyle} type="button">Detail</button>
      </div>
      {item.status !== 'lunas' ? (
        <>
          <form action={formAction} style={formGridStyle}>
            <input name="intent" type="hidden" value="quick_pay" />
            <input name="id" type="hidden" value={item.id} />
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Jumlah bayar</span>
              <input defaultValue={item.cicilan_per_bulan || item.sisa_hutang} min={1} name="jumlah" style={inputStyle} type="number" />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Tanggal</span>
              <input defaultValue={defaultDate} name="tanggal" style={inputStyle} type="date" />
            </label>
            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <span style={fieldLabelStyle}>Catatan</span>
              <input defaultValue="Quick pay" name="keterangan" style={inputStyle} />
            </label>
            <button disabled={isPending} style={primaryButtonStyle} type="submit">Quick Pay</button>
          </form>
          <form action={formAction} style={{ marginTop: theme.spacing.sm }}>
            <input name="intent" type="hidden" value="pay_full" />
            <input name="id" type="hidden" value={item.id} />
            <input name="tanggal" type="hidden" value={defaultDate} />
            <input name="keterangan" type="hidden" value="Lunasi semua" />
            <button disabled={isPending} style={secondaryButtonStyle} type="submit">Lunasi Semua</button>
          </form>
        </>
      ) : null}
      <details style={{ marginTop: theme.spacing.md }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Edit</summary>
        <TagihanForm formAction={formAction} intent="update" isPending={isPending} item={item} />
      </details>
      <details style={{ marginTop: theme.spacing.md }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>History dan Struk</summary>
        <HistoryAndStruk formAction={formAction} histories={histories} isPending={isPending} item={item} struk={struk} />
      </details>
      <form action={formAction} style={{ marginTop: theme.spacing.sm }}>
        <input name="intent" type="hidden" value="delete" />
        <input name="id" type="hidden" value={item.id} />
        <button disabled={isPending} style={dangerButtonStyle} type="submit">Hapus</button>
      </form>
    </article>
  );
}

function HistoryAndStruk({
  formAction,
  histories,
  isPending,
  item,
  struk,
}: {
  formAction: (payload: FormData) => void;
  histories: Extract<TagihanPreviewState, { status: 'ready' }>['histories'];
  isPending: boolean;
  item: TagihanItem;
  struk: Extract<TagihanPreviewState, { status: 'ready' }>['struk'];
}) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
      <form action={formAction} encType="multipart/form-data" style={formGridStyle}>
        <input name="intent" type="hidden" value="upload_struk" />
        <input name="id" type="hidden" value={item.id} />
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>File struk</span>
          <input accept="image/jpeg,image/png,image/webp,application/pdf" name="struk_file" style={inputStyle} type="file" />
        </label>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Keterangan</span>
          <input name="keterangan" style={inputStyle} />
        </label>
        <button disabled={isPending} style={secondaryButtonStyle} type="submit">Upload Struk</button>
      </form>
      <div>
        <strong>History</strong>
        {histories.length > 0 ? histories.slice(0, 5).map((history) => (
          <p key={history.id} style={helperTextStyle}>
            {history.created_at ? `${formatDateID(history.created_at)} - ` : ''}{history.detail} ({formatCurrencyIDR(history.jumlah)})
          </p>
        )) : <p style={helperTextStyle}>Belum ada history.</p>}
      </div>
      <div>
        <strong>Struk</strong>
        {struk.length > 0 ? struk.map((itemStruk) => (
          <div key={itemStruk.id} style={buttonRowStyle}>
            <a href={itemStruk.signed_url || itemStruk.file_url} rel="noreferrer" style={secondaryLinkStyle} target="_blank">
              {itemStruk.file_name || 'Buka struk'}
            </a>
            <form action={formAction}>
              <input name="intent" type="hidden" value="delete_struk" />
              <input name="id" type="hidden" value={item.id} />
              <input name="struk_id" type="hidden" value={itemStruk.id} />
              <button disabled={isPending} style={dangerButtonStyle} type="submit">Hapus Struk</button>
            </form>
          </div>
        )) : <p style={helperTextStyle}>Belum ada struk.</p>}
      </div>
    </div>
  );
}

function TagihanForm({
  formAction,
  intent,
  isPending,
  item,
}: {
  formAction: (payload: FormData) => void;
  intent: 'create' | 'update';
  isPending: boolean;
  item?: TagihanItem;
}) {
  return (
    <form action={formAction} style={formGridStyle}>
      <input name="intent" type="hidden" value={intent} />
      {item ? <input name="id" type="hidden" value={item.id} /> : null}
      <Field defaultValue={item?.debitur_nama} label="Debitur" name="debitur_nama" required />
      <Field defaultValue={item?.debitur_kontak} label="Kontak" name="debitur_kontak" />
      <Field defaultValue={item?.barang_nama} label="Barang" name="barang_nama" required />
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Status</span>
        <select defaultValue={item?.status ?? 'aktif'} name="status" style={inputStyle}>
          <option value="aktif">Aktif</option>
          <option value="lunas">Lunas</option>
          <option value="overdue">Overdue</option>
          <option value="ditunda">Ditunda</option>
        </select>
      </label>
      <Field defaultValue={String(item?.harga_awal ?? 0)} label="Harga awal" name="harga_awal" type="number" />
      <Field defaultValue={String(item?.bunga_persen ?? 0)} label="Bunga %" name="bunga_persen" type="number" />
      <Field defaultValue={String(item?.jangka_waktu_bulan ?? 1)} label="Tenor bulan" name="jangka_waktu_bulan" type="number" />
      <Field defaultValue={String(item?.total_hutang ?? 0)} label="Total hutang" name="total_hutang" type="number" />
      <Field defaultValue={String(item?.total_dibayar ?? 0)} label="Total dibayar" name="total_dibayar" type="number" />
      <Field defaultValue={String(item?.cicilan_per_bulan ?? 0)} label="Cicilan/bulan" name="cicilan_per_bulan" type="number" />
      <Field defaultValue={item?.tanggal_mulai} label="Tanggal mulai" name="tanggal_mulai" type="date" />
      <Field defaultValue={item?.tanggal_mulai_bayar} label="Mulai bayar" name="tanggal_mulai_bayar" type="date" />
      <Field defaultValue={item?.tanggal_jatuh_tempo} label="Jatuh tempo" name="tanggal_jatuh_tempo" type="date" />
      <Field defaultValue={String(item?.tgl_bayar_tanggal ?? '')} label="Tgl bayar" name="tgl_bayar_tanggal" type="number" />
      <Field defaultValue={String(item?.tgl_tempo_tanggal ?? '')} label="Tgl tempo" name="tgl_tempo_tanggal" type="number" />
      <Field defaultValue={item?.metode_pembayaran} label="Metode" name="metode_pembayaran" />
      <Field defaultValue={item?.sumber_modal ?? 'modal_terpisah'} label="Sumber modal" name="sumber_modal" />
      <Field defaultValue={item?.jenis_tempo ?? 'bulanan'} label="Jenis tempo" name="jenis_tempo" />
      <Field defaultValue={String(item?.denda_persen_per_hari ?? 0)} label="Denda %/hari" name="denda_persen_per_hari" type="number" />
      <Field defaultValue={String(item?.kuantitas ?? 1)} label="Kuantitas" name="kuantitas" type="number" />
      <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
        <span style={fieldLabelStyle}>Catatan</span>
        <textarea defaultValue={item?.catatan ?? ''} name="catatan" rows={3} style={inputStyle} />
      </label>
      <button disabled={isPending} style={primaryButtonStyle} type="submit">{intent === 'create' ? 'Tambah' : 'Simpan'}</button>
    </form>
  );
}

function TagihanPagination({ state }: { state: Extract<TagihanPreviewState, { status: 'ready' }> }) {
  if (state.totalPages <= 1) return null;
  const params = new URLSearchParams();
  if (state.query.search) params.set('search', state.query.search);
  if (state.query.status !== 'all') params.set('status', state.query.status);
  if (state.query.sort !== 'terbaru') params.set('sort', state.query.sort);
  params.set('pageSize', String(state.pageSize));

  const hrefFor = (page: number) => {
    params.set('page', String(page));
    return `/tagihan?${params.toString()}#tagihan-list`;
  };

  return (
    <nav aria-label="Pagination" style={{ ...buttonRowStyle, justifyContent: 'center' }}>
      <a href={hrefFor(Math.max(1, state.page - 1))} style={secondaryLinkStyle}>Sebelumnya</a>
      <strong style={{ alignSelf: 'center' }}>Halaman {state.page} / {state.totalPages}</strong>
      <a href={hrefFor(Math.min(state.totalPages, state.page + 1))} style={secondaryLinkStyle}>Berikutnya</a>
    </nav>
  );
}

function TagihanDetailDialog({ item, onClose }: { item: TagihanItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <div aria-modal="true" role="dialog" style={dialogBackdropStyle}>
      <article style={dialogStyle}>
        <button onClick={onClose} style={{ ...secondaryButtonStyle, float: 'right' }} type="button">Tutup</button>
        <h2 style={{ fontSize: 24, marginTop: 0 }}>{item.debitur_nama}</h2>
        <p style={helperTextStyle}>{item.barang_nama} / {item.status}</p>
        <p style={{ lineHeight: 1.6 }}>Total hutang {formatCurrencyIDR(item.total_hutang)}, dibayar {formatCurrencyIDR(item.total_dibayar)}, sisa {formatCurrencyIDR(item.sisa_hutang)}.</p>
        <p style={helperTextStyle}>Kontak: {item.debitur_kontak || '-'} / Metode: {item.metode_pembayaran || '-'}</p>
        <p style={helperTextStyle}>Catatan: {item.catatan || '-'}</p>
      </article>
    </div>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
  type = 'text',
}: {
  defaultValue?: string | number | null;
  label: string;
  name: string;
  required?: boolean;
  type?: 'date' | 'number' | 'text';
}) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <input defaultValue={defaultValue ?? ''} min={type === 'number' ? 0 : undefined} name={name} required={required} style={inputStyle} type={type} />
    </label>
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

const sectionTitleStyle = {
  fontSize: 20,
  marginTop: 0,
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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

const helperTextStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: 0,
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
  minHeight: 44,
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
  minHeight: 44,
  padding: '10px 12px',
} as const;

const secondaryLinkStyle = {
  ...secondaryButtonStyle,
  display: 'inline-flex',
  marginTop: theme.spacing.md,
  textDecoration: 'none',
} as const;

const dangerButtonStyle = {
  ...primaryButtonStyle,
  background: '#8c2f2f',
} as const;

const dialogBackdropStyle = {
  alignItems: 'center',
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: theme.spacing.md,
  position: 'fixed',
  zIndex: 40,
} as const;

const dialogStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  maxHeight: '88vh',
  maxWidth: 720,
  overflowY: 'auto',
  padding: theme.spacing.lg,
  width: '100%',
} as const;
