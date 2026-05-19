import { livoriaColors, livoriaSpacing } from '@livoria/ui-tokens';

export const theme = {
  colors: livoriaColors,
  spacing: livoriaSpacing,
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
  },
} as const;

export type LivoriaTheme = typeof theme;
