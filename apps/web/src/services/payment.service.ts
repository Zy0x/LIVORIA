import { tagihanRepository } from '@/features/tagihan/services/tagihan.repository';
import type { Tagihan } from '@/lib/types';

export type { BungaPeriode, CalcInput, CalcResult } from '@/features/tagihan/domain/tagihan-calculation';
export { calculateTagihan, reverseCalculateTagihan } from '@/features/tagihan/domain/tagihan-calculation';

export async function recordPayment(
  tagihan: Tagihan,
  jumlah: number,
  tanggal: string,
  keterangan: string = '',
): Promise<Tagihan> {
  return tagihanRepository.recordPayment(tagihan, jumlah, tanggal, keterangan);
}
