import { chainComparators, compareDateAsc, compareDateDesc, compareNumberDesc, compareTextAsc } from '@/shared/domain/sort-utils';
import type { SortMode, Tagihan } from '../types/tagihan.types';

export function sortTagihanItems(items: Tagihan[], sortMode: SortMode): Tagihan[] {
  const byCreatedDesc = (a: Tagihan, b: Tagihan) => compareDateDesc(a.created_at, b.created_at);
  const byDebitur = (a: Tagihan, b: Tagihan) => compareTextAsc(a.debitur_nama, b.debitur_nama);
  const byBarang = (a: Tagihan, b: Tagihan) => compareTextAsc(a.barang_nama, b.barang_nama);
  const result = [...items];

  switch (sortMode) {
    case 'sisa_terbesar':
      return result.sort(chainComparators((a, b) => compareNumberDesc(Number(a.sisa_hutang), Number(b.sisa_hutang)), byCreatedDesc, byDebitur));
    case 'jatuh_tempo':
      return result.sort(chainComparators((a, b) => compareDateAsc(a.tanggal_jatuh_tempo, b.tanggal_jatuh_tempo), byCreatedDesc, byDebitur));
    case 'nama_az':
      return result.sort(chainComparators(byDebitur, byBarang, byCreatedDesc));
    case 'terbaru':
    default:
      return result.sort(chainComparators(byCreatedDesc, byDebitur, byBarang));
  }
}
