# LIVORIA Debuggability Map

Generated: 2026-05-21T07:43:20.323Z

## Summary

- Scanned files: 388
- Risky/debug-priority files: 53
- Feature buckets: 21
- Layer buckets: 15

## Debug Scripts

| Script | Command |
| --- | --- |
| audit:project | `node scripts/audit/livoria-project-audit.mjs` |
| audit:risk | `node scripts/audit/livoria-risk-scan.mjs` |
| audit:next | `node scripts/audit/livoria-next-readiness.mjs` |
| audit:edge | `node scripts/audit/livoria-edge-safety.mjs` |
| audit:migration-gate | `node scripts/audit/livoria-migration-gate.mjs` |
| audit:route-parity | `node scripts/audit/livoria-route-parity.mjs` |
| audit:migration-full | `node scripts/audit/livoria-route-parity.mjs --strict-full-native` |
| debug:map | `node scripts/audit/livoria-debug-map.mjs` |
| debug:map:md | `node scripts/audit/livoria-debug-map.mjs --markdown docs/audits/debuggability-map.md --markdown-only` |
| debug:audit | `corepack pnpm audit:project && corepack pnpm audit:route-parity && corepack pnpm debug:map` |
| check | `corepack pnpm --filter @livoria/web typecheck && corepack pnpm --filter @livoria/web build && corepack pnpm audit:migration-gate --strict && corepack pnpm audit:route-parity && corepack pnpm check:packages` |

## Layer Summary

| Layer | Files | Lines | Risky |
| --- | ---: | ---: | ---: |
| component | 173 | 24991 | 32 |
| hook | 46 | 4342 | 5 |
| other | 32 | 3856 | 7 |
| page | 5 | 2202 | 5 |
| service | 27 | 2159 | 1 |
| lib | 18 | 2039 | 0 |
| edge-function | 9 | 1860 | 0 |
| domain | 28 | 1797 | 0 |
| script | 8 | 1345 | 0 |
| style | 3 | 1169 | 2 |
| package | 3 | 523 | 0 |
| route | 16 | 265 | 1 |
| type | 6 | 209 | 0 |
| shared | 8 | 156 | 0 |
| schema | 6 | 138 | 0 |

## Feature Summary

| Feature | Files | Lines | Risky | Pages | Components | Hooks | Services |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shared | 201 | 29581 | 39 | 0 | 108 | 22 | 2 |
| anime | 33 | 3398 | 3 | 3 | 15 | 5 | 2 |
| donghua | 32 | 3295 | 3 | 3 | 15 | 5 | 2 |
| tagihan | 34 | 2316 | 2 | 2 | 13 | 5 | 4 |
| media | 14 | 2093 | 1 | 0 | 4 | 1 | 7 |
| waifu | 20 | 1258 | 1 | 3 | 8 | 4 | 2 |
| obat | 19 | 1182 | 1 | 3 | 8 | 3 | 2 |
| dashboard | 10 | 1057 | 2 | 1 | 2 | 1 | 1 |
| supabase/functions/admin-backup | 3 | 519 | 0 | 0 | 0 | 0 | 0 |
| supabase/functions/telegram-tagihan | 3 | 508 | 0 | 0 | 0 | 0 | 0 |
| packages/core | 1 | 489 | 0 | 0 | 0 | 0 | 0 |
| supabase/functions/bulk-import-ai | 1 | 442 | 0 | 0 | 0 | 0 | 0 |
| supabase/functions/ai-titles | 1 | 298 | 0 | 0 | 0 | 0 | 0 |
| settings | 4 | 179 | 0 | 1 | 0 | 0 | 3 |
| root | 2 | 153 | 1 | 2 | 0 | 0 | 0 |
| admin | 4 | 129 | 0 | 1 | 0 | 0 | 1 |
| supabase/functions/admin-auth | 1 | 93 | 0 | 0 | 0 | 0 | 0 |
| packages/ui-tokens | 1 | 27 | 0 | 0 | 0 | 0 | 0 |
| auth | 2 | 19 | 0 | 1 | 0 | 0 | 1 |
| login | 1 | 8 | 0 | 1 | 0 | 0 | 0 |
| packages/data | 1 | 7 | 0 | 0 | 0 | 0 | 0 |

## Debug-Priority Files

| File | Layer | Lines | Risk | Suggested split |
| --- | --- | ---: | --- | --- |
| apps/web/src/features/media/components/MediaCardPrimitives.tsx | component | 482 | component-hard-to-debug, browser-api-heavy | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/ScrollDirectionButton.tsx | component | 408 | ui-heavy-static-import, browser-api-heavy | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/app/layout.tsx | route | 145 | browser-api-heavy | Split only when there is a clear debugging boundary and behavior can be verified by existing tests/build. |
| apps/web/src/components/shared/ExportMenu.tsx | component | 697 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/ImportExportButton.tsx | component | 688 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/anime/components/AnimeCard.tsx | component | 690 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/donghua/components/DonghuaCard.tsx | component | 690 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/anime/pages/AnimePage.tsx | page | 692 | large-file, page-not-thin, ui-heavy-static-import | Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components. |
| apps/web/src/features/donghua/pages/DonghuaPage.tsx | page | 692 | large-file, page-not-thin, ui-heavy-static-import | Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components. |
| apps/web/src/hooks/pwa/useServiceWorkerUpdate.ts | hook | 118 | browser-api-heavy | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/hooks/useDonghuaSearch.ts | hook | 533 | large-file, hook-too-broad | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/components/GroupActionMenu.tsx | component | 374 | browser-api-heavy | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/PWAPrompt.tsx | component | 207 | ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/tagihan/TagihanLaporan.tsx | component | 688 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/tagihan/TagihanExport.tsx | component | 250 | ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/NotificationBell.tsx | component | 206 | ui-direct-supabase, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/shared/MediaCard.tsx | component | 542 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/hooks/pwa/pwa-platform.ts | hook | 55 | browser-api-heavy | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/components/tagihan/TagihanDetail.tsx | component | 634 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/Sidebar.tsx | component | 423 | ui-direct-supabase, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/route-pages/Dashboard.tsx | other | 523 | large-file | Split only when there is a clear debugging boundary and behavior can be verified by existing tests/build. |
| apps/web/src/hooks/useAlternativeTitles.ts | hook | 414 | hook-too-broad | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/hooks/useAnimeSearch.ts | hook | 361 | hook-too-broad | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/components/ui/sidebar.tsx | component | 638 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/tagihan/TagihanList.tsx | component | 566 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/tagihan/pages/TagihanPage.tsx | page | 275 | ui-heavy-static-import, many-relative-imports | Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components. |
| apps/web/src/components/shared/AnimeExtraFields.tsx | component | 698 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/shared/CoverLightbox.tsx | component | 469 | component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/route-pages/Admin.tsx | other | 693 | large-file | Split only when there is a clear debugging boundary and behavior can be verified by existing tests/build. |
| apps/web/src/components/shared/BulkImportDialog.tsx | component | 657 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |

## Recommendations

- Use debug:map before large refactors to see the top risk files and their split suggestions.
- Keep page files thin; pages should orchestrate hooks/components and avoid direct Supabase calls.
- Keep domain files pure; no React hooks, browser APIs, or Supabase imports.
- Move repeated UI date/currency formatting into shared formatter helpers only when behavior is generic.
- Split large components by visible responsibility instead of creating overly generic abstractions.

