import { Link as RouterLink } from 'react-router-dom';
import { CalendarDays, Edit3, Link2, Pin, Trash2 } from 'lucide-react';
import { ROUTES } from '@/app/route-paths';
import {
  CATATAN_COLORS,
  CATATAN_RELATED_TYPE_LABELS,
  type CatatanItem,
  type CatatanRelatedType,
} from '../types/catatan.types';

type CatatanCardProps = {
  item: CatatanItem;
  onEdit: (item: CatatanItem) => void;
  onDelete: (item: CatatanItem) => void;
};

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const RELATED_ROUTES: Record<CatatanRelatedType, string> = {
  tagihan: ROUTES.TAGIHAN,
  anime: ROUTES.ANIME,
  donghua: ROUTES.DONGHUA,
  waifu: ROUTES.WAIFU,
  obat: ROUTES.OBAT,
};

export function CatatanCard({ item, onEdit, onDelete }: CatatanCardProps) {
  const color = CATATAN_COLORS.find((entry) => entry.value === item.color) || CATATAN_COLORS[0];
  const relatedLabel = item.related_type ? CATATAN_RELATED_TYPE_LABELS[item.related_type] : null;

  return (
    <article className="catatan-card stat-card flex min-h-[220px] flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {item.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-bold text-warning border border-warning/20">
                <Pin className="w-3 h-3" /> Semat
              </span>
            )}
            <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${color.className}`}>
              {color.label}
            </span>
          </div>
          <h3 className="break-words text-base font-bold text-foreground leading-snug">{item.title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            title="Edit catatan"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            title="Hapus catatan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="line-clamp-6 flex-1 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
        {item.content || 'Tidak ada isi catatan.'}
      </p>

      {item.related_type && item.related_id && (
        <RouterLink
          to={RELATED_ROUTES[item.related_type]}
          className="mt-4 inline-flex min-w-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-all"
          title={`Buka ${relatedLabel}`}
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0">{relatedLabel}</span>
          <span className="truncate text-foreground/80">{item.related_title || 'Data terkait'}</span>
        </RouterLink>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarDays className="w-3.5 h-3.5" />
        Diperbarui {formatDate(item.updated_at)}
      </div>
    </article>
  );
}
