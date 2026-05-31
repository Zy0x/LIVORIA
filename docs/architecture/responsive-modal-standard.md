# Responsive Modal Standard

LIVORIA uses `src/components/ui/dialog.tsx` as the single modal sizing baseline.

Rules:
- Dialog content must fit inside `100dvh` and scroll internally.
- Feature dialogs should set only their intended max width, for example `sm:max-w-xl`.
- Long forms must use `min-w-0`, wrapping text, and one-column mobile grids.
- Modal bodies must not depend on browser zoom or DevTools viewport size to remain usable.
- If a feature needs a custom modal surface, keep `overflow-y-auto overflow-x-hidden overscroll-contain`.

This standard protects AI auto-fill forms, import/export dialogs, and mobile viewport variants from clipped controls.
