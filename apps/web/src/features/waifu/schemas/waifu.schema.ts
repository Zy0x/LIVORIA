import { z } from 'zod';
import { EMPTY_WAIFU_FORM, WAIFU_TIERS } from '../types/waifu.types';

export const waifuFormSchema = z.object({
  name: z.string().trim().min(1, 'Nama waifu wajib diisi.'),
  source: z.string().trim().default(EMPTY_WAIFU_FORM.source),
  source_type: z.enum(['anime', 'donghua']).default(EMPTY_WAIFU_FORM.source_type),
  tier: z.enum(WAIFU_TIERS).default(EMPTY_WAIFU_FORM.tier),
  image_url: z.string().trim().default(EMPTY_WAIFU_FORM.image_url),
  notes: z.string().trim().default(EMPTY_WAIFU_FORM.notes),
});

export function parseWaifuForm(input: unknown) {
  return waifuFormSchema.safeParse(input);
}
