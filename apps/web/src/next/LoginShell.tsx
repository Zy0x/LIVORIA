'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  isClientAuthConfigured,
  startGoogleAuth,
  submitEmailAuth,
  type AuthMode,
} from './lib/auth/client';
import { PreviewShell } from './PreviewShell';
import { theme } from './lib/theme';

export function LoginShell() {
  const authConfigured = isClientAuthConfigured();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!authConfigured) {
      setMessage('Koneksi akun belum tersedia.');
      return;
    }
    if (!email.trim() || !password) {
      setMessage('Email dan password wajib diisi.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setMessage('Password minimal 6 karakter.');
      return;
    }

    setPending(true);
    try {
      const result = await submitEmailAuth(mode, email, password);
      setMessage(result.message);
      if (result.refresh) router.refresh();
      if (result.redirectTo) router.push(result.redirectTo);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Autentikasi gagal.';
      setMessage(rawMessage === 'Invalid login credentials' ? 'Email atau password tidak sesuai.' : rawMessage);
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleLogin() {
    setMessage('');
    if (!authConfigured) {
      setMessage('Koneksi akun belum tersedia.');
      return;
    }

    setPending(true);
    try {
      await startGoogleAuth(window.location.origin);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login Google gagal.');
      setPending(false);
    }
  }

  return (
    <PreviewShell eyebrow="Akses Akun" title="Masuk ke LIVORIA">
      <section style={{
        background: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 12,
        maxWidth: 560,
        padding: theme.spacing.lg,
      }}>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginTop: 0 }}>
          Masuk untuk menghubungkan sesi LIVORIA dengan data pribadi, pengaturan,
          dan sinkronisasi aman.
        </p>
        <div style={{
          background: authConfigured ? '#edf7f0' : '#fff7e6',
          border: `1px solid ${authConfigured ? theme.colors.success : theme.colors.warning}`,
          borderRadius: 8,
          color: theme.colors.foreground,
          marginBottom: theme.spacing.md,
          padding: theme.spacing.md,
        }}>
          Koneksi akun: {authConfigured ? 'siap digunakan' : 'belum tersedia'}
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <button onClick={() => setMode('login')} style={mode === 'login' ? primaryButtonStyle : secondaryButtonStyle} type="button">
            Login
          </button>
          <button onClick={() => setMode('signup')} style={mode === 'signup' ? primaryButtonStyle : secondaryButtonStyle} type="button">
            Daftar
          </button>
          <button onClick={() => setMode('admin')} style={mode === 'admin' ? primaryButtonStyle : secondaryButtonStyle} type="button">
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: theme.spacing.md }}>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Email</span>
            <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required style={inputStyle} type="email" value={email} />
          </label>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Password</span>
            <input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onChange={(event) => setPassword(event.target.value)} required style={inputStyle} type={showPassword ? 'text' : 'password'} value={password} />
          </label>
          <label style={{ alignItems: 'center', display: 'flex', gap: 8, minHeight: 44 }}>
            <input checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} type="checkbox" />
            Tampilkan password
          </label>
          <button disabled={pending || !authConfigured} style={primaryButtonStyle} type="submit">
            {mode === 'login' ? 'Masuk' : mode === 'signup' ? 'Buat Akun' : 'Masuk Admin'}
          </button>
        </form>

        <button disabled={pending || !authConfigured} onClick={handleGoogleLogin} style={{ ...secondaryButtonStyle, marginTop: theme.spacing.sm, width: '100%' }} type="button">
          Masuk dengan Google
        </button>

        {message ? (
          <p style={{ color: message.includes('berhasil') ? theme.colors.success : theme.colors.warning, fontWeight: 700 }}>
            {message}
          </p>
        ) : null}
      </section>
    </PreviewShell>
  );
}

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
