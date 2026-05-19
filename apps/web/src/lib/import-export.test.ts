import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('./supabase', () => ({ supabase: {} }));

import { importFromCSV, importFromJSON } from './import-export';

function makeFile(content: string, name: string): File {
  return {
    name,
    size: new Blob([content]).size,
    text: async () => content,
  } as File;
}

describe('import-export validation', () => {
  it('casts Tagihan CSV number fields before schema validation', async () => {
    const file = makeFile(
      [
        [
          'debitur_nama',
          'barang_nama',
          'harga_awal',
          'bunga_persen',
          'jangka_waktu_bulan',
          'tgl_bayar_hari',
        ].join(','),
        ['Budi', 'iPhone', '20000000', '10', '12', ''].join(','),
      ].join('\n'),
      'tagihan.csv'
    );
    const schema = z.object({
      debitur_nama: z.string().min(1),
      barang_nama: z.string().min(1),
      harga_awal: z.number(),
      bunga_persen: z.number(),
      jangka_waktu_bulan: z.number(),
      tgl_bayar_hari: z.number().nullable(),
    }).passthrough();

    const rows = await importFromCSV(file, { schema, label: 'Tagihan' });

    expect(rows[0]).toMatchObject({
      debitur_nama: 'Budi',
      barang_nama: 'iPhone',
      harga_awal: 20_000_000,
      bunga_persen: 10,
      jangka_waktu_bulan: 12,
      tgl_bayar_hari: null,
    });
  });

  it('rejects imports beyond the configured row limit', async () => {
    const file = makeFile(
      JSON.stringify([{ title: 'A' }, { title: 'B' }, { title: 'C' }]),
      'anime.json'
    );

    await expect(importFromJSON(file, { maxRows: 2 })).rejects.toThrow(
      'Maksimal 2 baris'
    );
  });
});
