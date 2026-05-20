import Link from 'next/link';
import type { ObatPreviewState, ObatQuery } from '../obat.repository';
import {
  buttonRowStyle,
  panelStyle,
  secondaryButtonStyle,
} from './obat.styles';
import { theme } from '../../../lib/theme';

export function ObatPagination({ state }: { state: Extract<ObatPreviewState, { status: 'ready' }> }) {
  const pageLinks = Array.from({ length: state.totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination Obat" style={{ ...panelStyle, marginTop: theme.spacing.md }}>
      <p style={{ color: theme.colors.muted, marginTop: 0 }}>
        Menampilkan {state.items.length} dari {state.totalFiltered} data.
      </p>
      <div style={buttonRowStyle}>
        {pageLinks.map((page) => (
          <Link
            aria-current={page === state.page ? 'page' : undefined}
            href={buildObatHref(state.query, page)}
            key={page}
            style={page === state.page ? activePageStyle : secondaryButtonStyle}
          >
            {page}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function buildObatHref(query: ObatQuery, page: number) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.type !== 'all') params.set('type', query.type);
  if (query.frequency !== 'all') params.set('frequency', query.frequency);
  if (query.sort !== 'terbaru') params.set('sort', query.sort);
  if (query.pageSize !== 12) params.set('pageSize', String(query.pageSize));
  if (page !== 1) params.set('page', String(page));
  const search = params.toString();
  return `/obat${search ? `?${search}` : ''}#obat-list`;
}

const activePageStyle = {
  ...secondaryButtonStyle,
  background: theme.colors.primary,
  color: theme.colors.primaryForeground,
} as const;
