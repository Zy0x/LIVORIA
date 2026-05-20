import { z } from 'zod';

export const quickPaySchema = z.object({
  jumlah: z.number().positive(),
  tanggal: z.string().min(1),
  keterangan: z.string().max(200).optional().default(''),
});

export type QuickPaySchema = z.infer<typeof quickPaySchema>;

