import type { SourceType, WaifuItem as BaseWaifuItem, WaifuTier } from '@/lib/types';

export type WaifuItem = BaseWaifuItem;
export type { SourceType, WaifuTier };

export type WaifuSortMode = 'terbaru' | 'nama_az' | 'tier';
export type WaifuTierFilter = 'all' | WaifuTier;
export type WaifuSourceFilter = 'all' | SourceType;

export type WaifuFormValues = Pick<WaifuItem, 'name' | 'source' | 'source_type' | 'tier' | 'image_url' | 'notes'>;
export type WaifuInput = Partial<WaifuFormValues>;
export type WaifuSourceTitle = { title: string; type: SourceType };

export type WaifuMutationInput = WaifuInput & {
  imageFile?: File | null;
};

export const WAIFU_TIERS = ['S', 'A', 'B', 'C'] as const;

export const WAIFU_TIER_COLORS: Record<WaifuTier, string> = {
  S: 'bg-pastel-yellow text-warning font-bold',
  A: 'bg-pastel-green text-success font-bold',
  B: 'bg-pastel-blue text-info font-bold',
  C: 'bg-muted text-muted-foreground font-bold',
};

export const EMPTY_WAIFU_FORM: WaifuFormValues = {
  name: '',
  source: '',
  source_type: 'anime',
  tier: 'B',
  image_url: '',
  notes: '',
};
