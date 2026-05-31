import type { CatatanColor, CatatanInput, CatatanItem } from '../types/catatan.types';

const COLORS = new Set<CatatanColor>(['sage', 'blue', 'amber', 'rose', 'violet']);

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const asBoolean = (value: unknown) => value === true;

const asTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const asColor = (value: unknown): CatatanColor => {
  const color = asString(value) as CatatanColor;
  return COLORS.has(color) ? color : 'sage';
};

export function mapCatatanRow(row: Record<string, unknown>): CatatanItem {
  return {
    id: asString(row.id),
    user_id: asString(row.user_id),
    title: asString(row.title, 'Tanpa judul'),
    content: asString(row.content),
    tags: asTags(row.tags),
    color: asColor(row.color),
    is_pinned: asBoolean(row.is_pinned),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

export function mapCatatanRows(rows: Record<string, unknown>[] | null): CatatanItem[] {
  return (rows ?? []).map(mapCatatanRow);
}

export function mapCatatanInput(input: CatatanInput) {
  return {
    title: input.title.trim(),
    content: input.content.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    color: input.color,
    is_pinned: input.is_pinned,
    updated_at: new Date().toISOString(),
  };
}
