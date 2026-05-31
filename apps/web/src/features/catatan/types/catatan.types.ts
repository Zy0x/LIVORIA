export type CatatanColor = 'sage' | 'blue' | 'amber' | 'rose' | 'violet';
export type CatatanRelatedType = 'tagihan' | 'anime' | 'donghua' | 'waifu' | 'obat';

export interface CatatanItem {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  color: CatatanColor;
  is_pinned: boolean;
  related_type: CatatanRelatedType | null;
  related_id: string | null;
  related_title: string | null;
  created_at: string;
  updated_at: string;
}

export type CatatanSortMode = 'terbaru' | 'diperbarui' | 'judul_az';
export type CatatanFilterMode = 'all' | 'pinned' | 'with_tags' | 'linked';

export interface CatatanFormValues {
  title: string;
  content: string;
  tagsText: string;
  color: CatatanColor;
  is_pinned: boolean;
  related_type: CatatanRelatedType | 'none';
  related_id: string;
}

export interface CatatanInput {
  title: string;
  content: string;
  tags: string[];
  color: CatatanColor;
  is_pinned: boolean;
  related_type: CatatanRelatedType | null;
  related_id: string | null;
  related_title: string | null;
}

export interface CatatanRelatedOption {
  type: CatatanRelatedType;
  id: string;
  title: string;
  subtitle: string;
  route: string;
  searchText: string;
}

export const CATATAN_COLORS: Array<{ value: CatatanColor; label: string; className: string }> = [
  { value: 'sage', label: 'Sage', className: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'blue', label: 'Biru', className: 'bg-info/10 text-info border-info/20' },
  { value: 'amber', label: 'Amber', className: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'rose', label: 'Rose', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { value: 'violet', label: 'Violet', className: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
];

export const CATATAN_RELATED_TYPE_LABELS: Record<CatatanRelatedType, string> = {
  tagihan: 'Tagihan',
  anime: 'Anime',
  donghua: 'Donghua',
  waifu: 'Waifu',
  obat: 'Obat',
};

export const EMPTY_CATATAN_FORM: CatatanFormValues = {
  title: '',
  content: '',
  tagsText: '',
  color: 'sage',
  is_pinned: false,
  related_type: 'none',
  related_id: '',
};
