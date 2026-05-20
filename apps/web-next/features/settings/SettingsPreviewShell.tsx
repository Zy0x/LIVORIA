import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';
import type { SettingsPreviewState } from './settings.repository';

type SettingsPreviewShellProps = {
  state: SettingsPreviewState;
};

const panels = [
  {
    detail: 'Akan dipindahkan setelah auth action dan logout boundary tersedia.',
    title: 'Profil',
  },
  {
    detail: 'Akan tetap client-only karena terkait install/update PWA dan service worker.',
    title: 'PWA',
  },
  {
    detail: 'Akan memakai server action dengan validasi relasi tagihan, history, dan struk.',
    title: 'Backup dan Restore',
  },
  {
    detail: 'Akan memakai server action yang mengikat subscription ke user aktif.',
    title: 'Telegram',
  },
] as const;

export function SettingsPreviewShell({ state }: SettingsPreviewShellProps) {
  return (
    <PreviewShell eyebrow="Migrasi Bertahap" title="Pengaturan Preview">
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
      </section>

      <section style={gridStyle}>
        {panels.map((panel) => (
          <article key={panel.title} style={panelStyle}>
            <h2 style={{ fontSize: 20, marginTop: 0 }}>{panel.title}</h2>
            <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
              {panel.detail}
            </p>
          </article>
        ))}
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

const gridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginTop: theme.spacing.md,
} as const;
