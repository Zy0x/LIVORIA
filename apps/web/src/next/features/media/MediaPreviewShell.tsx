'use client';

import {
  formatDateID,
  MEDIA_STATUSES,
  parseAlternativeTitles,
  resolveMediaDisplayTitle,
  WATCH_STATUSES,
  type MediaItem,
} from '@livoria/core';
import { useActionState, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PreviewShell } from '@/next/PreviewShell';
import { theme } from '../../lib/theme';
import {
  initialMediaActionState,
  submitMediaAction,
} from './media.actions';
import type { MediaPreviewState } from './media.repository';
import {
  buttonRowStyle,
  checkStyle,
  compactGridStyle,
  dangerButtonStyle,
  dialogBackdropStyle,
  dialogStyle,
  fieldLabelStyle,
  fieldStyle,
  filterGridStyle,
  formGridStyle,
  gridStyle,
  helperTextStyle,
  imageStyle,
  inputStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  secondaryLinkStyle,
  sectionTitleStyle,
  statLabelStyle,
  statsGridStyle,
  watchlistButtonStyle,
} from './media.styles';

type MediaPreviewShellProps = {
  state: MediaPreviewState;
};

export function MediaPreviewShell({ state }: MediaPreviewShellProps) {
  const label = getMediaLabel(state.table);
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [actionState, formAction, isPending] = useActionState(
    submitMediaAction,
    initialMediaActionState,
  );
  const canMutate = state.status === 'ready';
  const exportHref = useMemo(() => {
    if (state.status !== 'ready') return '';
    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(state.exportItems, null, 2))}`;
  }, [state]);

  return (
    <PreviewShell eyebrow="Koleksi Media" title={label}>
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
          <MediaStats state={state} />
          <MediaFilterBar state={state} />
          <MediaImportExport exportHref={exportHref} formAction={formAction} isPending={isPending} table={state.table} />
          <MediaWatchlist state={state} onDetail={setDetailItem} />
        </>
      ) : null}

      {canMutate ? (
        <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
          <h2 style={sectionTitleStyle}>Tambah {label}</h2>
          <MediaForm formAction={formAction} intent="create" isPending={isPending} table={state.table} />
        </section>
      ) : null}

      <div id="media-list" style={{ scrollMarginTop: 24 }} />
      <section style={gridStyle}>
        {state.items.length > 0 ? (
          state.items.map((item) => (
            <MediaPreviewCard
              formAction={formAction}
              isPending={isPending}
              item={item}
              key={item.id}
              onDetail={() => setDetailItem(item)}
              table={state.table}
              titleLang={state.status === 'ready' ? state.query.titleLang : 'default'}
            />
          ))
        ) : (
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>Belum ada data ditampilkan</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Belum ada item yang cocok dengan filter saat ini.
            </p>
          </article>
        )}
      </section>

      {state.status === 'ready' ? <MediaPagination state={state} /> : null}
      <MediaDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
    </PreviewShell>
  );
}

function MediaStats({ state }: { state: Extract<MediaPreviewState, { status: 'ready' }> }) {
  const stats = [
    ['Total', state.stats.totalCount],
    ['Watchlist', state.stats.watchlistCount],
    ['Selesai', state.stats.watchedCount],
    ['Favorit', state.stats.favoriteCount],
    ['Bookmark', state.stats.bookmarkedCount],
  ] as const;

  return (
    <section style={statsGridStyle}>
      {stats.map(([label, value]) => (
        <article key={label} style={panelStyle}>
          <p style={statLabelStyle}>{label}</p>
          <strong style={{ fontSize: 28 }}>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function MediaFilterBar({ state }: { state: Extract<MediaPreviewState, { status: 'ready' }> }) {
  return (
    <form action={`/${state.table}#media-list`} style={{ ...panelStyle, ...filterGridStyle, marginTop: theme.spacing.md }} method="get">
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Cari</span>
        <input defaultValue={state.query.search} name="search" placeholder="Judul, genre, studio..." style={inputStyle} />
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Status</span>
        <select defaultValue={state.query.status} name="status" style={inputStyle}>
          <option value="all">Semua</option>
          {MEDIA_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Watchlist</span>
        <select defaultValue={state.query.watch} name="watch" style={inputStyle}>
          <option value="all">Semua</option>
          {WATCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Genre</span>
        <select defaultValue={state.query.genre} name="genre" style={inputStyle}>
          <option value="all">Semua</option>
          {state.genreOptions.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Urutkan</span>
        <select defaultValue={state.query.sort} name="sort" style={inputStyle}>
          <option value="terbaru">Baru Ditambahkan</option>
          <option value="judul">Judul A-Z</option>
          <option value="rating">Rating</option>
          <option value="tahun">Tahun</option>
          <option value="progress">Progress</option>
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Judul</span>
        <select defaultValue={state.query.titleLang} name="titleLang" style={inputStyle}>
          <option value="default">Utama</option>
          <option value="alternative">Alternatif</option>
        </select>
      </label>
      <label style={checkStyle}>
        <input defaultChecked={state.query.favorite} name="favorite" type="checkbox" value="1" />
        Favorit
      </label>
      <label style={checkStyle}>
        <input defaultChecked={state.query.bookmark} name="bookmark" type="checkbox" value="1" />
        Bookmark
      </label>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Tab</span>
        <select defaultValue={state.query.tab} name="tab" style={inputStyle}>
          <option value="semua">Semua</option>
          <option value="watchlist">Watchlist</option>
        </select>
      </label>
      <input name="page" type="hidden" value="1" />
      <input name="pageSize" type="hidden" value={state.pageSize} />
      <button style={primaryButtonStyle} type="submit">Terapkan</button>
    </form>
  );
}

function MediaImportExport({
  exportHref,
  formAction,
  isPending,
  table,
}: {
  exportHref: string;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  table: MediaPreviewState['table'];
}) {
  return (
    <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
      <h2 style={sectionTitleStyle}>Import / Export</h2>
      <div style={buttonRowStyle}>
        <a download={`${table}-livoria.json`} href={exportHref || '#'} style={secondaryLinkStyle}>
          Export JSON
        </a>
        <form action={formAction} encType="multipart/form-data" style={{ ...buttonRowStyle, marginTop: 0 }}>
          <input name="intent" type="hidden" value="import_json" />
          <input name="table" type="hidden" value={table} />
          <input accept="application/json,.json" name="json_file" style={inputStyle} type="file" />
          <button disabled={isPending} style={secondaryButtonStyle} type="submit">Import JSON</button>
        </form>
      </div>
      <p style={helperTextStyle}>Import dibatasi 500 baris dan memakai validasi field dasar sebelum masuk database.</p>
    </section>
  );
}

function MediaWatchlist({
  onDetail,
  state,
}: {
  onDetail: (item: MediaItem) => void;
  state: Extract<MediaPreviewState, { status: 'ready' }>;
}) {
  if (state.watchlistPreview.length === 0) return null;

  return (
    <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
      <h2 style={sectionTitleStyle}>Watchlist</h2>
      <div style={compactGridStyle}>
        {state.watchlistPreview.map((item) => (
          <button key={item.id} onClick={() => onDetail(item)} style={watchlistButtonStyle} type="button">
            <strong>{resolveMediaDisplayTitle(item, state.query.titleLang)}</strong>
            <span>{item.watch_status ?? 'none'} / {item.episodes_watched ?? 0}/{item.episodes ?? '-'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MediaPreviewCard({
  formAction,
  isPending,
  item,
  onDetail,
  table,
  titleLang,
}: {
  formAction: (payload: FormData) => void;
  isPending: boolean;
  item: MediaItem;
  onDetail: () => void;
  table: MediaPreviewState['table'];
  titleLang: string;
}) {
  const displayTitle = resolveMediaDisplayTitle(item, titleLang);

  return (
    <article style={panelStyle}>
      {item.cover_url ? (
        <img alt={displayTitle} src={item.cover_url} style={imageStyle} />
      ) : (
        <div style={{ ...imageStyle, alignItems: 'center', display: 'flex', justifyContent: 'center' }}>
          Tanpa cover
        </div>
      )}
      <p style={{ color: theme.colors.primary, fontSize: 13, fontWeight: 800, margin: '12px 0 0' }}>
        {item.status} / {item.watch_status ?? 'none'}
      </p>
      <h2 style={{ fontSize: 22, margin: '8px 0' }}>{displayTitle || 'Tanpa judul'}</h2>
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
        <button onClick={onDetail} style={secondaryButtonStyle} type="button">Detail</button>
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
      <Field defaultValue={item?.season} label="Season" name="season" />
      <Field defaultValue={item?.cour} label="Cour" name="cour" />
      <Field defaultValue={item?.schedule} label="Jadwal" name="schedule" />
      <Field defaultValue={item?.parent_title} label="Parent title" name="parent_title" />
      <Field defaultValue={item?.duration_minutes ? String(item.duration_minutes) : ''} label="Durasi menit" name="duration_minutes" type="number" />
      <Field defaultValue={item?.cover_url} label="Cover URL" name="cover_url" wide />
      <Field defaultValue={item?.streaming_url} label="Streaming URL" name="streaming_url" wide />
      <Field defaultValue={item?.alternative_titles} label="Alternative titles JSON/CSV" name="alternative_titles" wide />
      <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
        <span style={fieldLabelStyle}>Synopsis</span>
        <textarea defaultValue={item?.synopsis ?? ''} name="synopsis" rows={3} style={inputStyle} />
      </label>
      <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
        <span style={fieldLabelStyle}>Catatan</span>
        <textarea defaultValue={item?.notes ?? ''} name="notes" rows={3} style={inputStyle} />
      </label>
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
      <label style={checkStyle}>
        <input defaultChecked={Boolean(item?.is_movie)} name="is_movie" type="checkbox" value="true" />
        Movie
      </label>
      <label style={checkStyle}>
        <input defaultChecked={Boolean(item?.is_hentai)} name="is_hentai" type="checkbox" value="true" />
        18+
      </label>
      <button disabled={isPending} style={primaryButtonStyle} type="submit">
        {intent === 'create' ? 'Tambah' : 'Simpan'}
      </button>
    </form>
  );
}

function MediaPagination({ state }: { state: Extract<MediaPreviewState, { status: 'ready' }> }) {
  if (state.totalPages <= 1) return null;
  const entries = new URLSearchParams();
  Object.entries(state.query).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      if (value) entries.set(key, '1');
      return;
    }
    if (value !== 'all' && value !== 'semua' && value !== '' && key !== 'page') entries.set(key, String(value));
  });
  entries.set('pageSize', String(state.pageSize));

  const hrefFor = (page: number) => {
    entries.set('page', String(page));
    return `/${state.table}?${entries.toString()}#media-list`;
  };

  return (
    <nav aria-label="Pagination" style={{ ...buttonRowStyle, justifyContent: 'center' }}>
      <a aria-disabled={state.page <= 1} href={hrefFor(Math.max(1, state.page - 1))} style={secondaryLinkStyle}>Sebelumnya</a>
      <strong style={{ alignSelf: 'center' }}>Halaman {state.page} / {state.totalPages}</strong>
      <a aria-disabled={state.page >= state.totalPages} href={hrefFor(Math.min(state.totalPages, state.page + 1))} style={secondaryLinkStyle}>Berikutnya</a>
    </nav>
  );
}

function MediaDetailDialog({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  if (!item) return null;
  const alternatives = parseAlternativeTitles(item.alternative_titles);

  return (
    <div role="dialog" aria-modal="true" style={dialogBackdropStyle}>
      <article style={dialogStyle}>
        <button onClick={onClose} style={{ ...secondaryButtonStyle, float: 'right' }} type="button">Tutup</button>
        <h2 style={{ fontSize: 24, marginTop: 0 }}>{item.title}</h2>
        <p style={helperTextStyle}>{item.status} / {item.watch_status ?? 'none'} / Rating {item.rating ?? '-'}</p>
        {alternatives.length > 0 ? <p style={helperTextStyle}>Judul lain: {alternatives.join(', ')}</p> : null}
        <p style={{ lineHeight: 1.6 }}>{item.synopsis || 'Synopsis belum diisi.'}</p>
        <p style={helperTextStyle}>Catatan: {item.notes || '-'}</p>
        <p style={helperTextStyle}>Studio: {item.studio || '-'} / Tahun: {item.release_year ?? '-'}</p>
        <p style={helperTextStyle}>Jadwal: {item.schedule || '-'} / Parent: {item.parent_title || '-'}</p>
        {item.streaming_url ? <a href={item.streaming_url} rel="noreferrer" style={secondaryLinkStyle} target="_blank">Buka streaming</a> : null}
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
