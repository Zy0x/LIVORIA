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
    backupSettingsSaving,
    nextBackupRun,
    backupLogs,
    countdown,
    setRestoreConfirmText,
    setAutoBackupEnabled,
    setAutoBackupTime,
    fetchBackupSettings,
    fetchBackups,
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
    <div ref={containerRef} className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <Breadcrumb />

      <div className="admin-card mb-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 pt-4 pb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Admin Panel &mdash; Pengembang</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all"
            >
              <LogOut className="w-3 h-3" /> Keluar
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-1">Panel Admin &#128452;&#65039;</h1>
          <p className="text-xs text-muted-foreground">Monitoring, backup otomatis, dan tinjauan pengguna.</p>
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
            backupSettingsSaving={backupSettingsSaving}
            nextBackupRun={nextBackupRun}
            countdown={countdown}
            onAutoBackupEnabledChange={setAutoBackupEnabled}
            onAutoBackupTimeChange={setAutoBackupTime}
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
