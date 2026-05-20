import type { LucideIcon } from 'lucide-react';
import { Plus, Shuffle, Trash2 } from 'lucide-react';

export type ImportMode = 'insert_only' | 'upsert' | 'replace_all';

export interface ImportModeOption {
  value: ImportMode;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  dangerous?: boolean;
}

export const IMPORT_MODE_OPTIONS: ImportModeOption[] = [
  {
    value: 'insert_only',
    label: 'Tambah Baru Saja',
    description: 'Hanya menambahkan entri baru. Entri yang sudah ada di koleksi tidak diubah.',
    icon: Plus,
    color: 'text-success',
  },
  {
    value: 'upsert',
    label: 'Tambah + Perbarui',
    description: 'Tambah entri baru dan perbarui entri yang sudah ada (berdasarkan ID atau Judul+Season).',
    icon: Shuffle,
    color: 'text-primary',
  },
  {
    value: 'replace_all',
    label: 'Ganti Semua Data',
    description: 'HAPUS semua data yang ada, lalu import ulang dari file. Gunakan hanya untuk restore backup.',
    icon: Trash2,
    color: 'text-destructive',
    dangerous: true,
  },
];
