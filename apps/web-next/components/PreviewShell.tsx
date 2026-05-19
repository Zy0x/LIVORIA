import Link from 'next/link';
import { theme } from '../lib/theme';

type PreviewShellProps = {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
};

export function PreviewShell({ children, eyebrow = 'Hybrid Preview', title }: PreviewShellProps) {
  return (
    <main style={{
      margin: '0 auto',
      maxWidth: 1040,
      minHeight: '100vh',
      padding: `${theme.spacing.xl}px ${theme.spacing.md}px`,
    }}>
      <header style={{
        alignItems: 'flex-start',
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
      }}>
        <div>
          <p style={{
            color: theme.colors.primary,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 0,
            margin: 0,
            textTransform: 'uppercase',
          }}>
            {eyebrow}
          </p>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: '8px 0 0' }}>
            {title}
          </h1>
        </div>
        <nav style={{ display: 'flex', gap: theme.spacing.sm }}>
          <Link href="/dashboard" style={linkStyle}>
            Dashboard
          </Link>
          <Link href="/obat" style={linkStyle}>
            Obat
          </Link>
          <Link href="/login" style={linkStyle}>
            Login
          </Link>
        </nav>
      </header>
      {children}
    </main>
  );
}

const linkStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  fontWeight: 700,
  padding: '10px 14px',
} as const;
