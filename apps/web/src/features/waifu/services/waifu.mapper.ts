import type { SourceType, WaifuInput, WaifuItem, WaifuSourceTitle, WaifuTier } from '../types/waifu.types';

const VALID_TIERS = new Set<WaifuTier>(['S', 'A', 'B', 'C']);
const VALID_SOURCE_TYPES = new Set<SourceType>(['anime', 'donghua']);

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeTier(value: unknown): WaifuTier {
  const tier = toStringValue(value) as WaifuTier;
  return VALID_TIERS.has(tier) ? tier : 'B';
}

function normalizeSourceType(value: unknown): SourceType {
  const sourceType = toStringValue(value) as SourceType;
  return VALID_SOURCE_TYPES.has(sourceType) ? sourceType : 'anime';
}

export function mapWaifuRow(row: Record<string, unknown>): WaifuItem {
  return {
    id: toStringValue(row.id),
    user_id: toStringValue(row.user_id),
    name: toStringValue(row.name),
    source: toStringValue(row.source),
    source_type: normalizeSourceType(row.source_type),
    tier: normalizeTier(row.tier),
    image_url: toStringValue(row.image_url),
    notes: toStringValue(row.notes),
    created_at: toStringValue(row.created_at),
  };
}

export function mapWaifuRows(rows: Record<string, unknown>[] | null | undefined): WaifuItem[] {
  return (rows ?? []).map(mapWaifuRow);
}

export function mapWaifuInput(input: WaifuInput): WaifuInput {
  return {
    name: input.name?.trim() ?? '',
    source: input.source?.trim() ?? '',
    source_type: normalizeSourceType(input.source_type),
    tier: normalizeTier(input.tier),
    image_url: input.image_url?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
  };
}

export function mapSourceTitles(
  rows: Record<string, unknown>[] | null | undefined,
  type: SourceType,
): WaifuSourceTitle[] {
  return (rows ?? [])
    .map((row) => ({ title: toStringValue(row.title), type }))
    .filter((row) => row.title.length > 0);
}
