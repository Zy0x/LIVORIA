import { z } from 'zod';

export const donghuaStatusSchema = z.enum(['on-going', 'completed', 'planned']);
export const donghuaWatchStatusSchema = z.enum(['none', 'want_to_watch', 'watching', 'watched']);

export const donghuaSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  status: donghuaStatusSchema,
  genre: z.string().optional().default(''),
  rating: z.coerce.number().min(0).max(10).default(0),
  episodes: z.coerce.number().min(0).default(0),
  episodes_watched: z.coerce.number().min(0).default(0),
  cover_url: z.string().optional().default(''),
  synopsis: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  season: z.coerce.number().min(0).default(1),
  cour: z.string().optional().default(''),
  streaming_url: z.string().optional().default(''),
  schedule: z.string().optional().default(''),
  parent_title: z.string().optional().default(''),
  is_movie: z.coerce.boolean().default(false),
  duration_minutes: z.coerce.number().min(1).nullable().optional(),
  is_hentai: z.coerce.boolean().optional().default(false),
  watch_status: donghuaWatchStatusSchema.optional().default('none'),
});

export type DonghuaSchemaInput = z.infer<typeof donghuaSchema>;

