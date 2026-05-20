# LIVORIA Next.js Migration Readiness Audit

Generated: 2026-05-20T17:46:01.353Z

## Ringkasan

- File discan: 71
- File rawan prioritas: 14
- File Next production: 57

## Next Production Gate

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
- Legacy parity bridge: Tidak
- Vite fallback build included: Tidak
- Full native route parity: Ya

## Workflow Safety Gate

- Allowed source repo guard: Ya
- Large sync guard: Ya
- Mass delete guard: Ya
- Dry-run default: Ya

## Urutan Migrasi Route

| Route | Risiko | Alasan |
| --- | --- | --- |
| / | low | Production memakai Dashboard native Next dengan summary, recent tagihan/media, dan entry quick pay. |
| /obat | low | Production now uses the native Next route with CRUD, search/filter/sort, pagination anchor, detail dialog, and JSON import/export. |
| /waifu | medium | Production now uses the native Next route with CRUD, image upload, source dropdown, tier/source/search filter, and JSON import/export. |
| /settings | medium | Production memakai settings native Next untuk profil, theme, backup, Telegram, dan PWA. |
| /anime | high | Production memakai media native Next dengan filter, pagination anchor, detail, watchlist, import/export, dan title switch. |
| /donghua | high | Production memakai media native Next dengan label Donghua, filter, detail, watchlist, import/export, dan title switch. |
| /tagihan | high | Production memakai Tagihan native Next dengan CRUD, quick pay, history, struk, report, kalkulator, dan export. |

## Full Native Route Parity

| Route | Mode produksi | Risiko | Missing capability |
| --- | --- | --- | --- |
| / | native-next | medium | - |
| /auth | native-next | medium | - |
| /admin | native-next | high | - |
| /obat | native-next | low | - |
| /waifu | native-next | medium | - |
| /settings | native-next | medium | - |
| /anime | native-next | high | - |
| /donghua | native-next | high | - |
| /tagihan | native-next | high | - |

## File Rawan Prioritas

| File | Lines | Browser API | Supabase refs | Heavy libs |
| --- | ---: | ---: | ---: | ---: |
| supabase/functions/admin-backup/index.ts | 368 | 0 | 21 | 0 |
| apps/web/features/media/MediaPreviewShell.tsx | 585 | 0 | 0 | 0 |
| apps/web/features/tagihan/tagihan.actions.ts | 331 | 0 | 9 | 0 |
| packages/core/src/index.ts | 489 | 0 | 0 | 0 |
| apps/web/features/tagihan/TagihanPreviewShell.tsx | 450 | 0 | 0 | 0 |
| supabase/functions/bulk-import-ai/index.ts | 442 | 0 | 0 | 0 |
| supabase/functions/telegram-tagihan/index.ts | 269 | 0 | 7 | 0 |
| apps/web/features/tagihan/tagihan.repository.ts | 312 | 0 | 4 | 0 |
| .github/workflows/sync.yml | 391 | 0 | 0 | 0 |
| apps/web/features/waifu/WaifuPreviewShell.tsx | 355 | 0 | 0 | 0 |
| apps/web/features/media/media.actions.ts | 229 | 0 | 6 | 0 |
| apps/web/features/dashboard/dashboard.repository.ts | 216 | 0 | 5 | 0 |
| apps/web/features/waifu/waifu.actions.ts | 186 | 0 | 5 | 0 |
| apps/web/features/obat/obat.actions.ts | 144 | 0 | 3 | 0 |

## Rekomendasi Pecah File

- `BulkImportDialog`: pisah parser, review model, duplicate handling, AI enrichment queue, dan insert adapter.
- `AnimePage`/`DonghuaPage`: ekstrak orchestrator state menjadi route shell dan pindahkan dialog state ke hook feature.
- `AnimeCard`/`DonghuaCard`: pisah action menu, cover media, progress/status, dan hover fan-cover behavior.
- `TagihanForm`: pisah payment-method storage, cycle preview, validation adapter, dan schedule preview.
- `Dashboard`: pindahkan semua formatter/derived finance summary ke repository/core sebelum route Next.
