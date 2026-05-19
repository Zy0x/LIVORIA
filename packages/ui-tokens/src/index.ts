export const uiTokensPackage = {
  name: '@livoria/ui-tokens',
  tokenFiles: ['tokens/colors.json', 'tokens/spacing.json'],
} as const;

export type UiTokenFile = typeof uiTokensPackage.tokenFiles[number];

export const livoriaColors = {
  background: '#f7f8f5',
  border: '#d9dfd5',
  card: '#ffffff',
  foreground: '#19231d',
  muted: '#6f7b72',
  primary: '#2d5040',
  primaryForeground: '#ffffff',
  success: '#4f8f6b',
  warning: '#b7791f',
} as const;

export const livoriaSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
