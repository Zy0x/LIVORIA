import { theme } from '../../../lib/theme';

export function WaifuImportExport({
  exportHref,
  formAction,
  isPending,
}: {
  exportHref: string;
  formAction: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <section style={panelStyle}>
      <h2 style={{ fontSize: 20, marginTop: 0 }}>Import / Export</h2>
      <div style={rowStyle}>
        <a download="livoria-waifu-export.json" href={exportHref} style={secondaryButtonStyle}>
          Export JSON
        </a>
        <form action={formAction} encType="multipart/form-data" style={rowStyle}>
          <input name="intent" type="hidden" value="import_json" />
          <input accept="application/json,.json" name="json_file" required style={inputStyle} type="file" />
          <button disabled={isPending} style={primaryButtonStyle} type="submit">
            Import JSON
          </button>
        </form>
      </div>
    </section>
  );
}

const panelStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  marginTop: theme.spacing.md,
  padding: theme.spacing.lg,
} as const;

const rowStyle = {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.sm,
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
  padding: '11px 14px',
} as const;

const secondaryButtonStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  cursor: 'pointer',
  display: 'inline-block',
  font: 'inherit',
  fontWeight: 800,
  padding: '10px 12px',
} as const;
