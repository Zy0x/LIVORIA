import { PreviewShell } from '../../components/PreviewShell';
import { theme } from '../../lib/theme';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <PreviewShell eyebrow="Admin" title="Admin Panel">
      <section style={{ background: theme.colors.card, border: `1px solid ${theme.colors.border}`, borderRadius: 12, padding: theme.spacing.lg }}>
        <p style={{ color: theme.colors.primary, fontWeight: 800, margin: 0 }}>Panel admin tersedia.</p>
        <p style={{ color: theme.colors.muted, lineHeight: 1.6, marginBottom: 0 }}>
          Backup, restore, dan audit admin tetap harus melewati Edge Function dan token admin server-side.
          Gunakan panel ini untuk pemeriksaan operasional dan akses pemeliharaan yang dibatasi sesi.
        </p>
      </section>
    </PreviewShell>
  );
}
