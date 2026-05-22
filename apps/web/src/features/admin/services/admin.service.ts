import { invokeAdminBackup } from './admin-backup.repository';
import type {
  AdminBackup,
  AdminBackupLog,
  AdminBackupPayload,
  AdminUser,
  AdminUserDetail,
} from '../types/admin.types';
import { withAdminSession, type AdminSession } from './admin-session';

export type { AdminSession } from './admin-session';

export interface AdminStatsResponse {
  counts?: Record<string, number>;
}

export interface AdminBackupSettingsResponse {
  settings?: { is_enabled: boolean; backup_time: string };
  next_run?: string | null;
  logs?: AdminBackupLog[];
}

export interface AdminBackupListResponse {
  backups?: AdminBackup[];
}

export interface AdminUsersResponse {
  users?: AdminUser[];
}

function withAdmin(session: AdminSession, body: Record<string, unknown>) {
  return withAdminSession(session, body);
}

export const adminService = {
  fetchStats: (session: AdminSession) =>
    invokeAdminBackup<AdminStatsResponse>({
      body: withAdmin(session, { action: 'stats' }),
    }),

  fetchBackupSettings: (session: AdminSession) =>
    invokeAdminBackup<AdminBackupSettingsResponse>({
      body: withAdmin(session, { action: 'get_backup_settings' }),
    }),

  updateBackupSettings: (
    session: AdminSession,
    settings: { is_enabled: boolean; backup_time: string },
  ) =>
    invokeAdminBackup({
      body: withAdmin(session, {
        action: 'update_backup_settings',
        ...settings,
      }),
    }),

  fetchBackups: (session: AdminSession) =>
    invokeAdminBackup<AdminBackupListResponse>({
      body: withAdmin(session, { action: 'list_backups' }),
    }),

  createBackup: (session: AdminSession) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'backup' }),
    }),

  downloadBackup: (session: AdminSession, backupId: string) =>
    invokeAdminBackup<AdminBackupPayload>({
      body: withAdmin(session, { action: 'get_backup', backupId }),
    }),

  deleteBackup: (session: AdminSession, backupId: string) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'delete_backup', backupId }),
    }),

  restoreDryRun: (session: AdminSession, backupData: unknown) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'restore', backupData, dryRun: true }),
    }),

  restore: (session: AdminSession, backupData: unknown, restoreConfirm: string) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'restore', backupData, restoreConfirm }),
    }),

  fetchUsers: (session: AdminSession) =>
    invokeAdminBackup<AdminUsersResponse>({
      body: withAdmin(session, { action: 'list_users' }),
    }),

  fetchUserDetail: (session: AdminSession, userId: string) =>
    invokeAdminBackup<AdminUserDetail>({
      body: withAdmin(session, { action: 'user_detail', userId }),
    }),

  deleteUser: (session: AdminSession, userId: string) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'delete_user', userId }),
    }),
};
