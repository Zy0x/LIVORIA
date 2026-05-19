import { z } from 'zod';
import { EMPTY_OBAT_FORM } from '../types/obat.types';

export const obatFormSchema = z.object({
  name: z.string().trim().min(1, 'Nama obat wajib diisi.'),
  type: z.string().trim().min(1).default(EMPTY_OBAT_FORM.type),
  dosage: z.string().trim().default(EMPTY_OBAT_FORM.dosage),
  usage_info: z.string().trim().default(EMPTY_OBAT_FORM.usage_info),
  notes: z.string().trim().default(EMPTY_OBAT_FORM.notes),
  frequency: z.string().trim().default(EMPTY_OBAT_FORM.frequency),
  side_effects: z.string().trim().default(EMPTY_OBAT_FORM.side_effects),
});

export function parseObatForm(input: unknown) {
  return obatFormSchema.safeParse(input);
}
