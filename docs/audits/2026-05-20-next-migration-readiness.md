# LIVORIA Next.js Migration Readiness Audit

Generated: 2026-05-19T22:16:33.563Z

## Ringkasan

- File discan: 331
- File rawan prioritas: 50
- File Next preview: 19

## Next Preview Gate

- Next app shell: Ya
- Supabase SSR skeleton: Ya
- Request session refresh boundary: Ya
- Next 16 proxy: Ya
- Dashboard route: Ya
- Obat route: Ya

## Workflow Safety Gate

- Allowed source repo guard: Ya
- Large sync guard: Ya
- Mass delete guard: Ya
- Dry-run default: Ya

## Urutan Migrasi Route

| Route | Risiko | Alasan |
| --- | --- | --- |
| /dashboard | medium | Read-only summary can move first after auth middleware and repository parity. |
| /obat | low | Small CRUD feature already has repository, mapper, hooks, and pagination boundary. |
| /waifu | medium | Needs storage upload boundary and source dropdown parity. |
| /settings | medium | Split Telegram, backup, PWA, and profile panels before moving. |
| /anime | high | Large page/card, AI title enrichment, bulk import, watchlist, pagination. |
| /donghua | high | Follows Anime but still has duplicate large page/card implementation. |
| /tagihan | high | Financial/payment flows require server action contracts and regression tests first. |

## File Rawan Prioritas

| File | Lines | Browser API | Supabase refs | Heavy libs |
| --- | ---: | ---: | ---: | ---: |
| apps/web/src/components/shared/BulkImportDialog.tsx | 2520 | 3 | 0 | 1 |
| apps/web/src/features/donghua/pages/DonghuaPage.tsx | 1479 | 6 | 0 | 1 |
| apps/web/src/features/anime/pages/AnimePage.tsx | 1478 | 6 | 0 | 1 |
| apps/web/src/features/anime/components/AnimeCard.tsx | 1172 | 28 | 0 | 1 |
| apps/web/src/features/donghua/components/DonghuaCard.tsx | 1172 | 28 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanForm.tsx | 1276 | 9 | 0 | 0 |
| apps/web/src/pages/Dashboard.tsx | 1238 | 2 | 1 | 1 |
| apps/web/src/components/shared/AnimeExtraFields.tsx | 870 | 2 | 0 | 0 |
| supabase/functions/admin-backup/index.ts | 451 | 0 | 21 | 0 |
| apps/web/src/hooks/useDonghuaSearch.ts | 807 | 0 | 2 | 0 |
| apps/web/src/pages/Admin.tsx | 781 | 4 | 0 | 1 |
| apps/web/src/lib/import-export.ts | 747 | 3 | 2 | 0 |
| apps/web/src/components/shared/ExportMenu.tsx | 733 | 7 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanLaporan.tsx | 752 | 1 | 0 | 2 |
| apps/web/src/components/ImportExportButton.tsx | 688 | 6 | 0 | 1 |
| apps/web/src/components/ui/sidebar.tsx | 638 | 3 | 0 | 0 |
| apps/web/src/hooks/usePWA.ts | 339 | 40 | 0 | 0 |
| supabase/functions/telegram-tagihan/index.ts | 497 | 0 | 8 | 0 |
| apps/web/src/components/tagihan/TagihanDetail.tsx | 634 | 0 | 0 | 1 |
| apps/web/src/components/ScrollDirectionButton.tsx | 458 | 20 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanList.tsx | 566 | 3 | 0 | 0 |
| apps/web/src/components/tagihan/TagihanCalculator.tsx | 574 | 0 | 0 | 0 |
| apps/web/src/components/shared/MediaCard.tsx | 542 | 1 | 0 | 1 |
| apps/web/src/components/shared/CoverLightbox.tsx | 469 | 6 | 0 | 0 |
| apps/web/src/features/tagihan/domain/tagihan-cycle.ts | 494 | 0 | 0 | 0 |
| apps/web/src/components/GroupActionMenu.tsx | 377 | 12 | 0 | 0 |
| apps/web/src/components/shared/AnimePageForm.tsx | 467 | 0 | 0 | 0 |
| apps/web/src/hooks/useAlternativeTitles.ts | 414 | 0 | 2 | 0 |
| apps/web/src/lib/supabase-service.ts | 264 | 0 | 9 | 0 |
| apps/web/src/components/Sidebar.tsx | 423 | 0 | 1 | 1 |
| supabase/functions/bulk-import-ai/index.ts | 442 | 0 | 0 | 0 |
| apps/web/src/features/anime/components/AnimeFilterBar.tsx | 345 | 11 | 0 | 0 |
| apps/web/src/features/donghua/components/DonghuaFilterBar.tsx | 345 | 11 | 0 | 0 |
| apps/web/src/pages/Settings.tsx | 394 | 3 | 0 | 0 |
| apps/web/src/integrations/supabase/types.ts | 416 | 0 | 0 | 0 |
| apps/web/src/hooks/useAnimeSearch.ts | 361 | 0 | 2 | 0 |
| .github/workflows/sync.yml | 391 | 0 | 0 | 0 |
| apps/web/src/components/PWAPrompt.tsx | 207 | 10 | 0 | 1 |
| apps/web/src/components/tagihan/TagihanExport.tsx | 250 | 4 | 0 | 3 |
| apps/web/src/lib/pwaNotifications.ts | 149 | 11 | 0 | 0 |

## Rekomendasi Pecah File

- `BulkImportDialog`: pisah parser, review model, duplicate handling, AI enrichment queue, dan insert adapter.
- `AnimePage`/`DonghuaPage`: ekstrak orchestrator state menjadi route shell dan pindahkan dialog state ke hook feature.
- `AnimeCard`/`DonghuaCard`: pisah action menu, cover media, progress/status, dan hover fan-cover behavior.
- `TagihanForm`: pisah payment-method storage, cycle preview, validation adapter, dan schedule preview.
- `Dashboard`: pindahkan semua formatter/derived finance summary ke repository/core sebelum route Next.

