import { theme } from '../../../lib/theme';

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
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

export const statLabelStyle = {
  color: theme.colors.muted,
  fontSize: 13,
  fontWeight: 800,
  margin: 0,
} as const;

export const cardGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  marginTop: theme.spacing.md,
} as const;

export const formGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
} as const;

export const filterGridStyle = {
  display: 'grid',
  gap: theme.spacing.md,
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
} as const;

export const inlineFormStyle = {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.sm,
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
  display: 'inline-block',
  font: 'inherit',
  fontWeight: 800,
  padding: '11px 14px',
} as const;

export const secondaryButtonStyle = {
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

export const dangerButtonStyle = {
  ...primaryButtonStyle,
  background: '#8c2f2f',
} as const;
