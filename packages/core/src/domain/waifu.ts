import { SOURCE_TYPES, WAIFU_TIERS, type SourceType, type WaifuTier } from '../contracts/status';
import { toStringValue } from '../utils/normalization';

export type WaifuItem = {
  id: string;
  user_id?: string;
  name: string;
  source: string;
  source_type: SourceType;
  tier: WaifuTier;
  image_url: string;
  notes: string;
  created_at?: string;
};

export type WaifuInput = Pick<
  WaifuItem,
  'name' | 'source' | 'source_type' | 'tier' | 'image_url' | 'notes'
>;

export type WaifuSourceTitle = {
  title: string;
  type: SourceType;
};

export function normalizeSourceType(value: unknown): SourceType {
  const sourceType = toStringValue(value) as SourceType;
  return SOURCE_TYPES.includes(sourceType) ? sourceType : 'anime';
}

export function normalizeWaifuTier(value: unknown): WaifuTier {
  const tier = toStringValue(value) as WaifuTier;
  return WAIFU_TIERS.includes(tier) ? tier : 'B';
}

export function normalizeWaifuItem(input: Partial<WaifuItem>): WaifuItem {
  return {
    created_at: input.created_at ? String(input.created_at) : undefined,
    id: String(input.id ?? ''),
    image_url: String(input.image_url ?? ''),
    name: String(input.name ?? ''),
    notes: String(input.notes ?? ''),
    source: String(input.source ?? ''),
    source_type: normalizeSourceType(input.source_type),
    tier: normalizeWaifuTier(input.tier),
    user_id: input.user_id ? String(input.user_id) : undefined,
  };
}

export function normalizeWaifuInput(input: Partial<Record<keyof WaifuInput, unknown>>): WaifuInput {
  return {
    image_url: String(input.image_url ?? '').trim(),
    name: String(input.name ?? '').trim(),
    notes: String(input.notes ?? '').trim(),
    source: String(input.source ?? '').trim(),
    source_type: normalizeSourceType(input.source_type),
    tier: normalizeWaifuTier(input.tier),
  };
}
