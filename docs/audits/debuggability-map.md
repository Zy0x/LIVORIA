# LIVORIA Debuggability Map

Generated: 2026-05-22T14:10:12.125Z

## Summary

- Scanned files: 499
- Risky/debug-priority files: 58
- Feature buckets: 21
- Layer buckets: 15

## Debug Scripts

| Script | Command |
| --- | --- |
| audit:project | `node scripts/audit/livoria-project-audit.mjs` |
| audit:risk | `node scripts/audit/livoria-risk-scan.mjs` |
| audit:next | `node scripts/audit/livoria-next-readiness.mjs` |
| audit:edge | `node scripts/audit/livoria-edge-safety.mjs` |
| audit:web-structure | `node scripts/audit/livoria-web-directory-guard.mjs` |
| audit:migration-gate | `node scripts/audit/livoria-migration-gate.mjs` |
| audit:route-parity | `node scripts/audit/livoria-route-parity.mjs` |
| audit:migration-full | `node scripts/audit/livoria-route-parity.mjs --strict-full-native` |
| debug:map | `node scripts/audit/livoria-debug-map.mjs` |
| debug:map:md | `node scripts/audit/livoria-debug-map.mjs --markdown docs/audits/debuggability-map.md --markdown-only` |
| debug:audit | `corepack pnpm audit:project && corepack pnpm audit:route-parity && corepack pnpm debug:map` |
| check | `corepack pnpm --filter @livoria/web typecheck && corepack pnpm --filter @livoria/web build && corepack pnpm audit:web-structure && corepack pnpm audit:migration-gate --strict && corepack pnpm audit:route-parity && corepack pnpm check:packages` |

## Layer Summary

| Layer | Files | Lines | Risky |
| --- | ---: | ---: | ---: |
| component | 207 | 28461 | 32 |
| other | 55 | 6427 | 9 |
| hook | 52 | 5382 | 6 |
| service | 47 | 4159 | 3 |
| domain | 34 | 2241 | 0 |
| page | 5 | 2206 | 5 |
| lib | 26 | 2014 | 0 |
| edge-function | 9 | 1896 | 0 |
| script | 9 | 1430 | 0 |
| style | 3 | 1381 | 2 |
| route | 16 | 286 | 1 |
| type | 7 | 255 | 0 |
| package | 15 | 192 | 0 |
| shared | 8 | 156 | 0 |
| schema | 6 | 138 | 0 |

## Feature Summary

| Feature | Files | Lines | Risky | Pages | Components | Hooks | Services |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shared | 265 | 35622 | 40 | 0 | 123 | 22 | 19 |
| anime | 33 | 3384 | 3 | 3 | 15 | 5 | 2 |
| donghua | 32 | 3281 | 3 | 3 | 15 | 5 | 2 |
| tagihan | 34 | 2342 | 2 | 2 | 13 | 5 | 4 |
| media | 14 | 2109 | 1 | 0 | 4 | 1 | 7 |
| dashboard | 20 | 2057 | 3 | 1 | 11 | 2 | 1 |
| admin | 19 | 1525 | 3 | 1 | 6 | 4 | 4 |
| waifu | 20 | 1267 | 1 | 3 | 8 | 4 | 2 |
| obat | 19 | 1191 | 1 | 3 | 8 | 3 | 2 |
| settings | 8 | 1009 | 0 | 1 | 3 | 1 | 3 |
| supabase/functions/telegram-tagihan | 3 | 544 | 0 | 0 | 0 | 0 | 0 |
| packages/core | 18 | 521 | 0 | 0 | 0 | 0 | 0 |
| supabase/functions/admin-backup | 3 | 519 | 0 | 0 | 0 | 0 | 0 |
| supabase/functions/bulk-import-ai | 1 | 442 | 0 | 0 | 0 | 0 | 0 |
| supabase/functions/ai-titles | 1 | 298 | 0 | 0 | 0 | 0 | 0 |
| auth | 3 | 204 | 0 | 1 | 1 | 0 | 1 |
| root | 2 | 176 | 1 | 2 | 0 | 0 | 0 |
| supabase/functions/admin-auth | 1 | 93 | 0 | 0 | 0 | 0 | 0 |
| packages/ui-tokens | 1 | 27 | 0 | 0 | 0 | 0 | 0 |
| packages/data | 1 | 7 | 0 | 0 | 0 | 0 | 0 |
| login | 1 | 6 | 0 | 1 | 0 | 0 | 0 |

## Debug-Priority Files

| File | Layer | Lines | Risk | Suggested split |
| --- | --- | ---: | --- | --- |
| apps/web/src/components/ScrollDirectionButton.tsx | component | 428 | ui-heavy-static-import, browser-api-heavy | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/media/components/MediaCardPrimitives.tsx | component | 483 | component-hard-to-debug, browser-api-heavy | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/hooks/pwa/useServiceWorkerUpdate.ts | hook | 239 | browser-api-heavy | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/app/layout.tsx | route | 168 | browser-api-heavy | Split only when there is a clear debugging boundary and behavior can be verified by existing tests/build. |
| apps/web/src/components/shared/ExportMenu.tsx | component | 695 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/ImportExportButton.tsx | component | 681 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/hooks/pwa/useOnlineStatus.ts | hook | 66 | browser-api-heavy | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/hooks/useDonghuaSearch.ts | hook | 579 | large-file, hook-too-broad | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/components/GroupActionMenu.tsx | component | 374 | browser-api-heavy | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/tagihan/TagihanExport.tsx | component | 300 | ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/tagihan/TagihanLaporan.tsx | component | 688 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/PWAPrompt.tsx | component | 213 | ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/NotificationBell.tsx | component | 208 | ui-direct-supabase, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/hooks/pwa/pwa-platform.ts | hook | 55 | browser-api-heavy | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/components/tagihan/TagihanDetail.tsx | component | 638 | large-file, component-hard-to-debug, ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/anime/components/AnimeCard.tsx | component | 661 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/donghua/components/DonghuaCard.tsx | component | 661 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/anime/pages/AnimePage.tsx | page | 685 | large-file, page-not-thin | Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components. |
| apps/web/src/features/donghua/pages/DonghuaPage.tsx | page | 685 | large-file, page-not-thin | Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components. |
| apps/web/src/hooks/useAlternativeTitles.ts | hook | 421 | hook-too-broad | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/hooks/useAnimeSearch.ts | hook | 412 | hook-too-broad | Separate server state, URL state, filter state, and mutation side effects into focused hooks. |
| apps/web/src/components/ui/sidebar.tsx | component | 638 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/tagihan/TagihanList.tsx | component | 571 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/tagihan/pages/TagihanPage.tsx | page | 283 | ui-heavy-static-import, many-relative-imports | Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components. |
| apps/web/src/components/shared/AnimeExtraFields.tsx | component | 699 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/shared/CoverLightbox.tsx | component | 469 | component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/shared/BulkImportDialog.tsx | component | 660 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/PWAManager.tsx | component | 321 | ui-heavy-static-import | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/components/shared/MediaCard.tsx | component | 513 | large-file, component-hard-to-debug | Split by visible responsibility: header, toolbar, form fields, action menu, list row/card, and modal body. |
| apps/web/src/features/waifu/pages/WaifuPage.tsx | page | 285 | ui-heavy-static-import, many-relative-imports | Keep the route/page as an orchestrator; move dialogs, filters, mutation handlers, and derived data into feature hooks/components. |

## Recommendations

- Use debug:map before large refactors to see the top risk files and their split suggestions.
- Keep page files thin; pages should orchestrate hooks/components and avoid direct Supabase calls.
- Keep domain files pure; no React hooks, browser APIs, or Supabase imports.
- Move repeated UI date/currency formatting into shared formatter helpers only when behavior is generic.
- Split large components by visible responsibility instead of creating overly generic abstractions.

