import { invokeAdminBackup } from './admin-backup.repository';

export interface AdminSession {
  email: string;
  key: string;
}

// TODO(security): replace raw key in sessionStorage with a short-lived admin token.
// TODO(security): validate admin session expiry server-side, not only in the client.
export function getAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem('livoria_admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem('livoria_admin');
      return null;
    }
    return { email: parsed.email, key: parsed.key };
  } catch {
    return null;
  }
}

function withAdmin(session: AdminSession, body: Record<string, unknown>) {
  return {
    ...body,
    email: session.email,
    password: session.key,
  };
}

export const adminService = {
  fetchStats: (session: AdminSession) =>
    invokeAdminBackup<{ counts?: Record<string, number> }>({
      body: withAdmin(session, { action: 'stats' }),
    }),

  fetchBackupSettings: (session: AdminSession) =>
    invokeAdminBackup<{
      settings?: { is_enabled: boolean; backup_time: string };
      next_run?: string | null;
      logs?: unknown[];
    }>({
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
    invokeAdminBackup<{ backups?: unknown[] }>({
      body: withAdmin(session, { action: 'list_backups' }),
    }),

  createBackup: (session: AdminSession) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'backup' }),
    }),

  downloadBackup: (session: AdminSession, backupId: string) =>
    invokeAdminBackup({
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
    invokeAdminBackup<{ users?: unknown[] }>({
      body: withAdmin(session, { action: 'list_users' }),
    }),

  fetchUserDetail: (session: AdminSession, userId: string) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'user_detail', userId }),
    }),

  deleteUser: (session: AdminSession, userId: string) =>
    invokeAdminBackup({
      body: withAdmin(session, { action: 'delete_user', userId }),
    }),
};
