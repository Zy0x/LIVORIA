'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { PreviewShell } from '@/next/PreviewShell';
import { createSupabaseBrowserClient } from '../../lib/supabase/browser';
import { theme } from '../../lib/theme';
import {
  initialSettingsActionState,
  submitSettingsAction,
} from './settings.actions';
import type { SettingsPreviewState } from './settings.repository';

type SettingsPreviewShellProps = {
  state: SettingsPreviewState;
};

export function SettingsPreviewShell({ state }: SettingsPreviewShellProps) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [pwaStatus, setPwaStatus] = useState('Memeriksa service worker...');
  const [actionState, formAction, isPending] = useActionState(
    submitSettingsAction,
    initialSettingsActionState,
  );
  const backupHref = useMemo(() => {
    if (state.status !== 'ready') return '';
    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(state.backupData, null, 2))}`;
  }, [state]);

  useEffect(() => {
    const stored = window.localStorage.getItem('livoria-theme') === 'dark';
    setDarkMode(stored);
    document.documentElement.classList.toggle('dark', stored);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration()
        .then((registration) => setPwaStatus(registration ? 'Service worker aktif.' : 'Service worker belum aktif.'))
        .catch(() => setPwaStatus('Status service worker tidak bisa dibaca.'));
    } else {
      setPwaStatus('Browser tidak mendukung service worker.');
    }
  }, []);

  function toggleTheme(next: boolean) {
    setDarkMode(next);
    window.localStorage.setItem('livoria-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  }

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/auth');
  }

  return (
    <PreviewShell eyebrow="Preferensi" title="Pengaturan">
      <section style={panelStyle}>
        <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>
          Status: {getStatusLabel(state.status)}
        </p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          {state.message}
        </p>
        {state.status === 'ready' ? (
          <p style={{ color: theme.colors.foreground, fontWeight: 700, marginBottom: 0 }}>
            Akun: {state.email}
          </p>
        ) : null}
        {actionState.message ? (
          <p style={{ color: actionState.ok ? theme.colors.success : theme.colors.warning, fontWeight: 700 }}>
            {actionState.message}
          </p>
        ) : null}
      </section>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h2 style={sectionTitleStyle}>Profil dan Tampilan</h2>
          <label style={checkStyle}>
            <input checked={darkMode} onChange={(event) => toggleTheme(event.target.checked)} type="checkbox" />
            Mode gelap
          </label>
          <button disabled={state.status !== 'ready'} onClick={logout} style={secondaryButtonStyle} type="button">
            Logout
          </button>
        </article>

        <article style={panelStyle}>
          <h2 style={sectionTitleStyle}>Backup dan Restore</h2>
          {state.status === 'ready' ? (
            <>
              <a download="livoria-backup.json" href={backupHref} style={secondaryLinkStyle}>Export Backup</a>
              <form action={formAction} encType="multipart/form-data" style={{ display: 'grid', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <input name="intent" type="hidden" value="import_backup" />
                <input accept="application/json,.json" name="backup_file" style={inputStyle} type="file" />
                <button disabled={isPending} style={primaryButtonStyle} type="submit">Import Backup</button>
              </form>
              <p style={helperTextStyle}>Import memakai upsert per ID dan memaksa semua row ke user aktif.</p>
            </>
          ) : <p style={helperTextStyle}>Login diperlukan untuk backup.</p>}
        </article>

        <article style={panelStyle}>
          <h2 style={sectionTitleStyle}>Telegram</h2>
          {state.status === 'ready' ? (
            <>
              <p style={helperTextStyle}>
                Status: {state.telegram?.is_active ? `Aktif (${state.telegram.chat_id})` : 'Belum terhubung'}
              </p>
              <form action={formAction} style={{ display: 'grid', gap: theme.spacing.sm }}>
                <input defaultValue={state.telegram?.chat_id ?? ''} name="chat_id" placeholder="Chat ID" style={inputStyle} />
                <div style={buttonRowStyle}>
                  <button disabled={isPending} name="intent" style={primaryButtonStyle} type="submit" value="telegram_register">Hubungkan</button>
                  <button disabled={isPending} name="intent" style={secondaryButtonStyle} type="submit" value="telegram_test">Test</button>
                  <button disabled={isPending} name="intent" style={dangerButtonStyle} type="submit" value="telegram_unregister">Putuskan</button>
                </div>
              </form>
              <form action={formAction} style={{ display: 'grid', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <input name="intent" type="hidden" value="telegram_preferences" />
                <label style={checkStyle}>
                  <input defaultChecked={state.telegram?.notify_monthly_report ?? true} name="notify_monthly_report" type="checkbox" />
                  Laporan bulanan
                </label>
                <label style={checkStyle}>
                  <input defaultChecked={state.telegram?.notify_overdue ?? true} name="notify_overdue" type="checkbox" />
                  Overdue alert
                </label>
                <label style={checkStyle}>
                  <input defaultChecked={state.telegram?.notify_due_reminder ?? true} name="notify_due_reminder" type="checkbox" />
                  Reminder tempo
                </label>
                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Tanggal laporan</span>
                  <input defaultValue={state.telegram?.monthly_report_date ?? 1} max={28} min={1} name="monthly_report_date" style={inputStyle} type="number" />
                </label>
                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Hari sebelum tempo</span>
                  <input defaultValue={state.telegram?.reminder_days_before ?? 3} max={30} min={0} name="reminder_days_before" style={inputStyle} type="number" />
                </label>
                <button disabled={isPending} style={secondaryButtonStyle} type="submit">Simpan Preferensi</button>
              </form>
            </>
          ) : <p style={helperTextStyle}>Login diperlukan untuk Telegram.</p>}
        </article>

        <article style={panelStyle}>
          <h2 style={sectionTitleStyle}>PWA</h2>
          <p style={helperTextStyle}>{pwaStatus}</p>
          <button onClick={() => window.location.reload()} style={secondaryButtonStyle} type="button">Refresh Aplikasi</button>
        </article>
      </section>
    </PreviewShell>
  );
}

function getStatusLabel(status: SettingsPreviewState['status']) {
  if (status === 'ready') return 'Siap';
  if (status === 'unauthenticated') return 'Perlu login';
  if (status === 'unconfigured') return 'Belum dikonfigurasi';
  return 'Error';
}

const panelStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  padding: theme.spacing.lg,
} as const;

const sectionTitleStyle = {
  fontSize: 20,
  marginTop: 0,
} as const;

const gridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

const fieldStyle = {
  display: 'grid',
  gap: 6,
} as const;

const fieldLabelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
} as const;

const inputStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  font: 'inherit',
  padding: '10px 12px',
} as const;

const helperTextStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  lineHeight: 1.5,
} as const;

const checkStyle = {
  alignItems: 'center',
  display: 'flex',
  gap: 8,
  minHeight: 44,
} as const;

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.sm,
} as const;

const primaryButtonStyle = {
  background: theme.colors.primary,
  border: 0,
  borderRadius: 8,
  color: theme.colors.primaryForeground,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  minHeight: 44,
  padding: '11px 14px',
} as const;

const secondaryButtonStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  minHeight: 44,
  padding: '10px 12px',
} as const;

const secondaryLinkStyle = {
  ...secondaryButtonStyle,
  display: 'inline-flex',
  textDecoration: 'none',
} as const;

const dangerButtonStyle = {
  ...primaryButtonStyle,
  background: '#8c2f2f',
} as const;
