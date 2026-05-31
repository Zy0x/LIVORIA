import { useState } from 'react';

import Breadcrumb from '@/components/Breadcrumb';
import TelegramSettings from '@/components/TelegramSettings';
import {
  SettingsAboutCard,
  SettingsAccountCard,
  SettingsDataBackupCard,
  SettingsSecurityCard,
  SettingsThemeCard,
} from '@/features/settings/components/SettingsCards';
import { SettingsImportDialog } from '@/features/settings/components/SettingsImportDialog';
import PWASettings from '@/features/settings/components/PWASettings';
import { useSettingsBackupImport } from '@/features/settings/hooks/useSettingsBackupImport';
import { useAuth } from '@/hooks/useAuth';

const Settings = () => {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const backupImport = useSettingsBackupImport(user?.id);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
  };

  return (
    <div className="w-full max-w-none">
      <Breadcrumb />
      <h1 className="page-header">Pengaturan</h1>
      <p className="page-subtitle mb-5">Kelola preferensi, tampilan, dan informasi akun pribadimu.</p>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsAccountCard user={user} />
        <SettingsDataBackupCard
          exporting={backupImport.exporting}
          importRef={backupImport.importRef}
          onBackup={backupImport.handleBackup}
          onImportFile={backupImport.handleImportFile}
        />
        <SettingsThemeCard theme={theme} onToggleTheme={toggleTheme} />
        <SettingsSecurityCard onSignOut={signOut} />
        <div className="xl:col-span-2">
          <TelegramSettings />
        </div>
        <div className="xl:col-span-2">
          <PWASettings />
        </div>
        <div className="xl:col-span-2">
          <SettingsAboutCard />
        </div>
      </div>

      <SettingsImportDialog
        open={backupImport.importOpen}
        onOpenChange={backupImport.setImportOpen}
        importMode={backupImport.importMode}
        onImportModeChange={backupImport.setImportMode}
        importPreview={backupImport.importPreview}
        importing={backupImport.importing}
        onCancel={backupImport.resetImport}
        onImport={backupImport.handleImport}
      />
    </div>
  );
};

export default Settings;
