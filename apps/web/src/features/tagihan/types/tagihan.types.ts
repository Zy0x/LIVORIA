export type {
  JenisTempo,
  Struk,
  Tagihan,
  TagihanHistory,
  TagihanStatus,
} from '@/lib/types';

export type FilterStatus = 'all' | import('@/lib/types').TagihanStatus;
export type SortMode = 'terbaru' | 'sisa_terbesar' | 'jatuh_tempo' | 'nama_az';
export type SubPage = 'tagihan' | 'laporan' | 'kalkulator';

