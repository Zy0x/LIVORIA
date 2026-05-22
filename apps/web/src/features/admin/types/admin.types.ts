export interface AdminUser {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
}

export interface AdminUserDetail {
  anime_count?: number;
  donghua_count?: number;
  waifu_count?: number;
  tagihan_count?: number;
  obat_count?: number;
  [key: string]: unknown;
}

export type AdminUserDetailMap = Record<string, AdminUserDetail>;

export interface AdminBackupMeta {
  app?: string;
  exported_at?: string;
  tables?: string[];
  counts?: Record<string, number>;
  [key: string]: unknown;
}

export interface AdminBackup {
  id: string;
  created_at?: string | null;
  meta?: string | AdminBackupMeta | null;
  [key: string]: unknown;
}

export interface AdminBackupLog {
  id: string;
  status?: 'success' | 'failed' | string | null;
  execution_time?: string | null;
  message?: string | null;
  [key: string]: unknown;
}

export interface AdminBackupPayload {
  _meta?: AdminBackupMeta;
  [key: string]: unknown;
}
