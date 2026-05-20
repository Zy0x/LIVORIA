# LIVORIA Next.js Migration Readiness Audit

Generated: 2026-05-20T15:14:53.882Z

## Ringkasan

- File discan: 408
- File rawan prioritas: 61
- File Next preview: 53

## Next Preview Gate

- Next app shell: Ya
- Supabase SSR skeleton: Ya
- Request session refresh boundary: Ya
- Next 16 proxy: Ya
- Dashboard route: Ya
- Tagihan route: Ya
- Anime route: Ya
- Donghua route: Ya
- Obat route: Ya
- Waifu route: Ya
- Pengaturan route: Ya

## Production Deployment Gate

- Next build production: Ya
- Legacy parity bridge: Ya
- Vite fallback build included: Ya
- Full native route parity: Belum

## Workflow Safety Gate

- Allowed source repo guard: Ya
- Large sync guard: Ya
- Mass delete guard: Ya
- Dry-run default: Ya

## Urutan Migrasi Route

| Route | Risiko | Alasan |
| --- | --- | --- |
| / | low | Production Next host rewrites to the legacy parity bridge so the full Vite dashboard remains available while native dashboard matures. |
| /obat | low | Production now uses the native Next route with CRUD, search/filter/sort, pagination anchor, detail dialog, and JSON import/export. |
| /waifu | medium | Production now uses the native Next route with CRUD, image upload, source dropdown, tier/source/search filter, and JSON import/export. |
| /settings | medium | Native settings shell exists; legacy parity bridge preserves profile, backup, Telegram, and PWA panels. |
| /anime | high | Native mutation route exists; legacy parity bridge preserves detail dialogs, watchlist, pagination, import/export, and bulk import. |
| /donghua | high | Native mutation route exists; legacy parity bridge preserves Donghua labels, detail dialogs, pagination, import/export, and bulk import. |
| /tagihan | high | Native quick-pay route exists; legacy parity bridge preserves forms, history, struk, reports, calculator, and export. |

## Full Native Route Parity

| Route | Mode produksi | Risiko | Missing capability |
| --- | --- | --- | --- |
| / | legacy-bridge | medium | recent-tagihan, recent-media, quick-pay-entry |
| /auth | legacy-bridge | medium | google-login, signup-flow, password-toggle |
| /admin | legacy-bridge | high | backup-list, manual-backup, restore-confirmation, delete-user-confirmation |
| /obat | native-next | low | - |
| /waifu | native-next | medium | - |
| /settings | legacy-bridge | medium | theme, backup-export, backup-import, telegram-settings, pwa-settings |
| /anime | legacy-bridge | high | search-filter-sort, pagination-scroll-anchor, detail-dialog, watchlist-panel, bulk-import-export, title-language-switch |
| /donghua | legacy-bridge | high | search-filter-sort, pagination-scroll-anchor, detail-dialog, watchlist-panel, bulk-import-export, title-language-switch |
| /tagihan | legacy-bridge | high | create-edit-delete, payment-history, receipt-upload, report, calculator, export, filter-sort-search |

## File Rawan Prioritas

| File | Lines | Browser API | Supabase refs | Heavy libs |
| --- | ---: | ---: | ---: | ---: |
| supabase/functions/admin-backup/index.ts | 368 | 0 | 21 | 0 |
| apps/web/src/components/shared/ExportMenu.tsx | 697 | 7 | 0 | 1 |
| apps/web/src/components/ImportExportButton.tsx | 688 | 6 | 0 | 1 |
| apps/web/src/features/anime/components/AnimeCard.tsx | 690 | 5 | 0 | 1 |
| apps/web/src/features/donghua/components/DonghuaCard.tsx | 690 | 5 | 0 | 1 |
| apps/web/src/features/anime/pages/AnimePage.tsx | 692 | 4 | 0 | 1 |
| apps/web/src/features/donghua/pages/DonghuaPage.tsx | 692 | 4 | 0 | 1 |
| apps/web/src/components/shared/AnimeExtraFields.tsx | 698 | 2 | 0 | 0 |
| apps/web/src/pages/Admin.tsx | 693 | 2 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanLaporan.tsx | 688 | 1 | 0 | 2 |
| apps/web/src/features/media/components/MediaCardPrimitives.tsx | 482 | 23 | 0 | 0 |
| apps/web/src/components/shared/BulkImportDialog.tsx | 657 | 1 | 0 | 0 |
| apps/web/src/components/ui/sidebar.tsx | 638 | 3 | 0 | 0 |
| apps/web/src/hooks/usePWA.ts | 339 | 40 | 0 | 0 |
| apps/web/src/components/tagihan/TagihanDetail.tsx | 634 | 0 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanFormAdvancedSections.tsx | 622 | 0 | 0 | 0 |
| apps/web/src/components/ScrollDirectionButton.tsx | 458 | 20 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanList.tsx | 566 | 3 | 0 | 0 |
| apps/web/src/components/tagihan/TagihanCalculator.tsx | 574 | 0 | 0 | 0 |
| apps/web/src/hooks/useDonghuaSearch.ts | 533 | 0 | 2 | 0 |
| apps/web/src/features/dashboard/DashboardMainSections.tsx | 566 | 0 | 0 | 0 |
| apps/web/src/pages/Dashboard.tsx | 523 | 2 | 1 | 1 |
| apps/web/src/components/shared/MediaCard.tsx | 542 | 1 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanForm.tsx | 523 | 0 | 0 | 0 |
| apps/web/src/components/shared/CoverLightbox.tsx | 469 | 6 | 0 | 0 |
| apps/web/src/lib/import-export.ts | 439 | 3 | 2 | 0 |
| apps/web/src/features/tagihan/domain/tagihan-cycle.ts | 494 | 0 | 0 | 0 |
| apps/web/src/components/shared/BulkImportPreviewStep.tsx | 492 | 0 | 0 | 0 |
| apps/web/src/components/GroupActionMenu.tsx | 377 | 12 | 0 | 0 |
| apps/web/src/components/shared/AnimePageForm.tsx | 467 | 0 | 0 | 0 |
| apps/web/src/hooks/useAlternativeTitles.ts | 414 | 0 | 2 | 0 |
| apps/web/src/lib/supabase-service.ts | 264 | 0 | 9 | 0 |
| apps/web/src/components/Sidebar.tsx | 423 | 0 | 1 | 1 |
| supabase/functions/bulk-import-ai/index.ts | 442 | 0 | 0 | 0 |
| apps/web/src/features/anime/components/AnimeFilterBar.tsx | 345 | 11 | 0 | 0 |
| apps/web/src/features/donghua/components/DonghuaFilterBar.tsx | 345 | 11 | 0 | 0 |
| apps/web/src/integrations/supabase/types.ts | 416 | 0 | 0 | 0 |
| packages/core/src/index.ts | 409 | 0 | 0 | 0 |
| supabase/functions/telegram-tagihan/index.ts | 269 | 0 | 7 | 0 |
| apps/web-next/features/media/MediaPreviewShell.tsx | 406 | 0 | 0 | 0 |

## Rekomendasi Pecah File

- `BulkImportDialog`: pisah parser, review model, duplicate handling, AI enrichment queue, dan insert adapter.
- `AnimePage`/`DonghuaPage`: ekstrak orchestrator state menjadi route shell dan pindahkan dialog state ke hook feature.
- `AnimeCard`/`DonghuaCard`: pisah action menu, cover media, progress/status, dan hover fan-cover behavior.
- `TagihanForm`: pisah payment-method storage, cycle preview, validation adapter, dan schedule preview.
- `Dashboard`: pindahkan semua formatter/derived finance summary ke repository/core sebelum route Next.

