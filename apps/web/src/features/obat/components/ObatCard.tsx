import { AlertCircle, Clock, Edit2, Eye, MoreVertical, Pill, ShieldAlert, Trash2 } from 'lucide-react';
import type { ObatItem } from '../types/obat.types';

type ObatCardProps = {
  obat: ObatItem;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ObatCard({ obat, menuOpen, onToggleMenu, onDetail, onEdit, onDelete }: ObatCardProps) {
  return (
    <div className="obat-card stat-card group cursor-pointer relative" onClick={onDetail}>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="absolute top-4 right-4 p-1.5 rounded-md bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 z-10 hidden md:flex"
      >
        <Trash2 className="w-3.5 h-3.5 text-destructive" />
      </button>
      <div className="absolute top-4 right-4 md:hidden card-action-menu z-10">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu();
          }}
          className="p-1.5 rounded-md bg-card/80 backdrop-blur-sm"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px] animate-scale-in">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDetail();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Detail
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
        )}
      </div>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-pastel-green flex items-center justify-center shrink-0">
          <Pill className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground">{obat.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{obat.type}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{obat.usage_info || 'Kegunaan belum diisi'}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {obat.dosage || '-'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {obat.frequency || '-'}
            </span>
          </div>
          {obat.side_effects && (
            <p className="text-xs text-warning mt-2 inline-flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> {obat.side_effects}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
