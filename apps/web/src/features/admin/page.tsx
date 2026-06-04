import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { LogOut, Shield } from 'lucide-react';

import { ROUTES } from '@/app/route-paths';
import Breadcrumb from '@/components/Breadcrumb';
import type { AdminTab } from './admin-page-helpers';
import { AdminTabs } from './components/AdminTabs';
import { BackupPanel } from './components/BackupPanel';
import { BackupSettingsPanel } from './components/BackupSettingsPanel';
import { DatabaseStatsPanel } from './components/DatabaseStatsPanel';
import { RestoreConfirmDialog } from './components/RestoreConfirmDialog';
import { UsersPanel } from './components/UsersPanel';
import { useAdminBackup } from './hooks/useAdminBackup';
import { useAdminSession } from './hooks/useAdminSession';
import { useAdminStats } from './hooks/useAdminStats';
import { useAdminUsers } from './hooks/useAdminUsers';

export default function AdminPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('database');
  const { adminSession, logout } = useAdminSession();
  const {
    tableStats,
    statsLoading,
    totalRecords,
    fetchStats,
  } = useAdminStats(adminSession);
  const refreshStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);
  const {
    exporting,
    restoring,
    backups,
    showRestoreConfirm,
    pendingRestoreData,
    restoreConfirmText,
    autoBackupEnabled,
    autoBackupTime,
    backupSettingsDirty,
    backupSettingsHydrated,
    backupSettingsLoading,
    backupSettingsSaving,
    nextBackupRun,
    backupLogs,
    countdown,
    setRestoreConfirmText,
    setAutoBackupEnabled,
    setAutoBackupTime,
    fetchBackupSettings,
    fetchBackups,
    handleSaveBackupSettings,
    handleBackup,
    handleDownloadBackup,
    handleDeleteBackup,
    initiateRestore,
    handleRestore,
    cancelRestore,
  } = useAdminBackup(adminSession, refreshStats);
  const {
    users,
    usersLoading,
    expandedUser,
    userDetails,
    fetchUsers,
    toggleUser,
    deleteUser,
  } = useAdminUsers(adminSession);

  useEffect(() => {
    if (!adminSession) navigate(ROUTES.AUTH, { replace: true });
  }, [adminSession, navigate]);

  useEffect(() => {
    if (adminSession) {
      fetchStats();
      fetchBackups();
      fetchBackupSettings();
    }
  }, [adminSession, fetchStats, fetchBackups, fetchBackupSettings]);

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) fetchUsers();
  }, [activeTab, fetchUsers, users.length]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.admin-card', { y: 20, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [tableStats, activeTab]);

  if (!adminSession) return null;

  return (
    <div ref={containerRef} className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 pb-24">
      <Breadcrumb />

      <div className="admin-card mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Admin Panel &mdash; Pengembang</span>
              </div>
              <h1 className="mb-1 text-2xl font-bold leading-tight text-foreground sm:text-3xl">Panel Admin &#128452;&#65039;</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">Monitoring database, backup otomatis, restore terkontrol, dan tinjauan pengguna.</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive transition-all hover:bg-destructive/20"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      </div>

      <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'database' && (
        <DatabaseStatsPanel
          tableStats={tableStats}
          totalRecords={totalRecords}
          statsLoading={statsLoading}
          onRefresh={fetchStats}
        />
      )}

      {activeTab === 'backup' && (
        <>
          <BackupSettingsPanel
            autoBackupEnabled={autoBackupEnabled}
            autoBackupTime={autoBackupTime}
            backupSettingsDirty={backupSettingsDirty}
            backupSettingsLoading={backupSettingsLoading || !backupSettingsHydrated}
            backupSettingsSaving={backupSettingsSaving}
            nextBackupRun={nextBackupRun}
            countdown={countdown}
            onAutoBackupEnabledChange={setAutoBackupEnabled}
            onAutoBackupTimeChange={setAutoBackupTime}
            onSave={handleSaveBackupSettings}
          />
          <BackupPanel
            backups={backups}
            backupLogs={backupLogs}
            exporting={exporting}
            restoring={restoring}
            restoreRef={restoreRef}
            onBackup={handleBackup}
            onDownloadBackup={handleDownloadBackup}
            onDeleteBackup={handleDeleteBackup}
            onRestoreFileChange={initiateRestore}
          />
        </>
      )}

      {activeTab === 'users' && (
        <UsersPanel
          users={users}
          usersLoading={usersLoading}
          expandedUser={expandedUser}
          userDetails={userDetails}
          onRefresh={fetchUsers}
          onToggleUser={toggleUser}
          onDeleteUser={deleteUser}
        />
      )}

      <RestoreConfirmDialog
        open={showRestoreConfirm}
        pendingRestoreData={pendingRestoreData}
        restoreConfirmText={restoreConfirmText}
        onRestoreConfirmTextChange={setRestoreConfirmText}
        onCancel={cancelRestore}
        onConfirm={handleRestore}
      />
    </div>
  );
}
