import { ROUTES } from '@/app/route-paths';

export type ScrollDirection = 'up' | 'down';

export const ADD_TRIGGER_SELECTOR: Record<string, string> = {
  [ROUTES.ANIME]: '[data-add-trigger="anime"]',
  [ROUTES.DONGHUA]: '[data-add-trigger="donghua"]',
  [ROUTES.TAGIHAN]: '[data-add-trigger="tagihan"]',
  [ROUTES.WAIFU]: '[data-add-trigger="waifu"]',
  [ROUTES.OBAT]: '[data-add-trigger="obat"]',
  [ROUTES.CATATAN]: '[data-add-trigger="catatan"]',
};

export const SCROLL_BUTTON_RAISED_BOTTOM = 'calc(3.5rem + 0.875rem)';
