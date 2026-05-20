'use client';

import { useEffect, useState } from 'react';
import { PreviewShell } from '../../components/PreviewShell';
import { createSupabaseBrowserClient } from '../../lib/supabase/browser';
import { theme } from '../../lib/theme';

type AdminSession = {
  email: string;
  token: string;
};

type AdminResult = Record<string, unknown> | null;

function getAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem('livoria_admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; expiresAt?: number; key?: string; token?: string; ts?: number };
    if (parsed.key || !parsed.email || !parsed.token || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem('livoria_admin');
      return null;
    }
    return { email: parsed.email, token: parsed.token };
  } catch {
    return null;
  }
}

export function AdminShell() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [result, setResult] = useState<AdminResult>(null);
  const [message, setMessage] = useState('Memeriksa sesi admin...');
  const [pending, setPending] = useState(false);
  const [restoreText, setRestoreText] = useState('');

  useEffect(() => {
    const current = getAdminSession();
    setSession(current);
    setMessage(current ? 'Sesi admin siap.' : 'Sesi admin tidak ditemukan. Login admin lewat /auth terlebih dahulu.');
  }, []);

  async function invokeAdmin(action: string, extra: Record<string, unknown> = {}) {
    const current = session ?? getAdminSession();
    if (!current) {
      setMessage('Sesi admin tidak tersedia.');
      return;
    }
    setPending(true);
    setMessage('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke<AdminResult>('admin-backup', {
        body: {
          action,
          adminToken: current.token,
          email: current.email,
          ...extra,
        },
      });
      if (error) throw error;
      if (data && typeof data === 'object' && 'error' in data) throw new Error(String(data.error));
      setResult(data ?? null);
      setMessage(`Aksi ${action} selesai.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Aksi ${action} gagal.`);
    } finally {
      setPending(false);
    }
  }

  async function handleRestore() {
    if (!restoreText.trim()) {
      setMessage('Payload restore belum diisi.');
      return;
    }
    const confirmed = window.confirm('Restore dapat menimpa data. Lanjutkan hanya jika backup sudah benar.');
    if (!confirmed) return;
    try {
      const backup = JSON.parse(restoreText) as unknown;
      await invokeAdmin('restore', { backup, confirmation: 'RESTORE LIVORIA' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payload restore tidak valid.');
    }
  }

  async function handleDeleteUser() {
    const userId = window.prompt('Masukkan user ID yang akan dihapus.');
    if (!userId) return;
    const confirmed = window.confirm(`Hapus user ${userId}? Aksi ini destruktif.`);
    if (!confirmed) return;
    await invokeAdmin('delete_user', { userId });
  }

  return (
    <PreviewShell eyebrow="Admin" title="Admin Panel">
      <section style={panelStyle}>
        <p style={{ color: session ? theme.colors.primary : theme.colors.warning, fontWeight: 800, margin: 0 }}>
          {message}
        </p>
        {session ? <p style={helperTextStyle}>Admin: {session.email}</p> : null}
      </section>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h2 style={sectionTitleStyle}>Database</h2>
          <div style={buttonRowStyle}>
            <button disabled={pending || !session} onClick={() => invokeAdmin('stats')} style={primaryButtonStyle} type="button">Statistik</button>
            <button disabled={pending || !session} onClick={() => invokeAdmin('list_users')} style={secondaryButtonStyle} type="button">List User</button>
            <button disabled={pending || !session} onClick={handleDeleteUser} style={dangerButtonStyle} type="button">Hapus User</button>
          </div>
        </article>

        <article style={panelStyle}>
          <h2 style={sectionTitleStyle}>Backup</h2>
          <div style={buttonRowStyle}>
            <button disabled={pending || !session} onClick={() => invokeAdmin('backup')} style={primaryButtonStyle} type="button">Backup Manual</button>
            <button disabled={pending || !session} onClick={() => invokeAdmin('list_backups')} style={secondaryButtonStyle} type="button">List Backup</button>
            <button disabled={pending || !session} onClick={() => invokeAdmin('get_backup_settings')} style={secondaryButtonStyle} type="button">Settings</button>
          </div>
        </article>

        <article style={panelStyle}>
          <h2 style={sectionTitleStyle}>Restore</h2>
          <textarea onChange={(event) => setRestoreText(event.target.value)} placeholder="Paste JSON backup admin di sini" rows={8} style={inputStyle} value={restoreText} />
          <button disabled={pending || !session} onClick={handleRestore} style={dangerButtonStyle} type="button">Restore Dengan Konfirmasi</button>
        </article>
      </section>

      <section style={{ ...panelStyle, marginTop: theme.spacing.md }}>
        <h2 style={sectionTitleStyle}>Output</h2>
        <pre style={preStyle}>{result ? JSON.stringify(result, null, 2) : 'Belum ada output.'}</pre>
      </section>
    </PreviewShell>
  );
}

const panelStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  padding: theme.spacing.lg,
} as const;

const gridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

const sectionTitleStyle = {
  fontSize: 20,
  marginTop: 0,
} as const;

const helperTextStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  lineHeight: 1.5,
} as const;

const inputStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  font: 'inherit',
  padding: '10px 12px',
  width: '100%',
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

const dangerButtonStyle = {
  ...primaryButtonStyle,
  background: '#8c2f2f',
} as const;

const preStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  maxHeight: 420,
  overflow: 'auto',
  padding: theme.spacing.md,
  whiteSpace: 'pre-wrap',
} as const;
