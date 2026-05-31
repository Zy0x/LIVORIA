import { z } from 'zod';

import type { CatatanInput } from '../types/catatan.types';
import { EMPTY_CATATAN_FORM } from '../types/catatan.types';

type CatatanFormParseResult =
  | { success: true; data: CatatanInput }
  | { success: false; error: z.ZodError };

export const catatanFormSchema = z.object({
  title: z.string().trim().min(1, 'Judul catatan wajib diisi.'),
  content: z.string().trim().default(EMPTY_CATATAN_FORM.content),
  tagsText: z.string().trim().default(EMPTY_CATATAN_FORM.tagsText),
  color: z.enum(['sage', 'blue', 'amber', 'rose', 'violet']).default(EMPTY_CATATAN_FORM.color),
  is_pinned: z.boolean().default(EMPTY_CATATAN_FORM.is_pinned),
});

const importTagsSchema = z.union([z.array(z.string()), z.string(), z.null(), z.undefined()]).transform((value) => {
  if (Array.isArray(value)) return value.map((tag) => tag.trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    }
  } catch {
    // Fallback to comma-separated tags.
  }
  return parseTags(trimmed);
});

const importPinnedSchema = z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]).transform((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return false;
  return ['true', '1', 'yes', 'ya'].includes(value.trim().toLowerCase());
});

export const catatanImportSchema = z.object({
  title: z.string().trim().min(1).default('Catatan'),
  content: z.string().trim().default(''),
  tags: importTagsSchema,
  color: z.enum(['sage', 'blue', 'amber', 'rose', 'violet']).default('sage'),
  is_pinned: importPinnedSchema,
}).passthrough();

const parseTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

export function parseCatatanForm(input: unknown): CatatanFormParseResult {
  const parsed = catatanFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error };

  return {
    success: true as const,
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      tags: parseTags(parsed.data.tagsText),
      color: parsed.data.color,
      is_pinned: parsed.data.is_pinned,
    } satisfies CatatanInput,
  };
}
