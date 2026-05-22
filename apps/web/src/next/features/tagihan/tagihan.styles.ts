import { theme } from '../../lib/theme';

export const panelStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  padding: theme.spacing.lg,
} as const;

export const sectionTitleStyle = {
  fontSize: 20,
  marginTop: 0,
} as const;

export const statsGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

export const statLabelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
  margin: 0,
} as const;

export const gridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

export const formGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

export const fieldStyle = {
  display: 'grid',
  gap: 6,
} as const;

export const fieldLabelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
} as const;

export const helperTextStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: 0,
} as const;

export const inputStyle = {
  background: theme.colors.background,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.foreground,
  font: 'inherit',
  padding: '10px 12px',
} as const;

export const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.sm,
  marginTop: theme.spacing.md,
} as const;

export const primaryButtonStyle = {
  alignSelf: 'end',
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

export const secondaryButtonStyle = {
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

export const secondaryLinkStyle = {
  ...secondaryButtonStyle,
  display: 'inline-flex',
  marginTop: theme.spacing.md,
  textDecoration: 'none',
} as const;

export const dangerButtonStyle = {
  ...primaryButtonStyle,
  background: '#8c2f2f',
} as const;

export const dialogBackdropStyle = {
  alignItems: 'center',
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: theme.spacing.md,
  position: 'fixed',
  zIndex: 40,
} as const;

export const dialogStyle = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  maxHeight: '88vh',
  maxWidth: 720,
  overflowY: 'auto',
  padding: theme.spacing.lg,
  width: '100%',
} as const;
