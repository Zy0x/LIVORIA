# LIVORIA Next Route Parity

Generated: 2026-05-20T15:14:37.629Z

Full native ready: Belum

## Route Status

| Route | Mode produksi | Risiko | Native entry | Missing capability | Smoke env |
| --- | --- | --- | --- | --- | --- |
| / | legacy-bridge | medium | Ada | recent-tagihan, recent-media, quick-pay-entry | LIVORIA_NEXT_NATIVE_ROUTES=/ |
| /auth | legacy-bridge | medium | Ada | google-login, signup-flow, password-toggle | LIVORIA_NEXT_NATIVE_ROUTES=/auth |
| /admin | legacy-bridge | high | Ada | backup-list, manual-backup, restore-confirmation, delete-user-confirmation | LIVORIA_NEXT_NATIVE_ROUTES=/admin |
| /obat | native-next | low | Ada | - | LIVORIA_NEXT_NATIVE_ROUTES=/obat |
| /waifu | native-next | medium | Ada | - | LIVORIA_NEXT_NATIVE_ROUTES=/waifu |
| /settings | legacy-bridge | medium | Ada | theme, backup-export, backup-import, telegram-settings, pwa-settings | LIVORIA_NEXT_NATIVE_ROUTES=/settings |
| /anime | legacy-bridge | high | Ada | search-filter-sort, pagination-scroll-anchor, detail-dialog, watchlist-panel, bulk-import-export, title-language-switch | LIVORIA_NEXT_NATIVE_ROUTES=/anime |
| /donghua | legacy-bridge | high | Ada | search-filter-sort, pagination-scroll-anchor, detail-dialog, watchlist-panel, bulk-import-export, title-language-switch | LIVORIA_NEXT_NATIVE_ROUTES=/donghua |
| /tagihan | legacy-bridge | high | Ada | create-edit-delete, payment-history, receipt-upload, report, calculator, export, filter-sort-search | LIVORIA_NEXT_NATIVE_ROUTES=/tagihan |

## Keputusan

Do not remove the legacy bridge globally yet. Migrate routes only after missing capabilities are closed and native smoke passes.
