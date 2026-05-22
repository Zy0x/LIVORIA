# LIVORIA Production Cleanup Audit - 2026-05-21

## Ringkasan

Audit ini dibuat setelah migrasi penuh ke Next.js dan visual parity legacy. Fokus utama: bug floating action button, PWA/cache, residual artifact, deploy automation, dan area file besar yang masih perlu dipecah bertahap.

## Perbaikan yang Dilakukan

- `ScrollDirectionButton` diubah menjadi stack layout tetap agar tombol tambah dan tombol scroll tidak bisa overlap saat animasi/load.
- Manifest PWA disesuaikan dengan icon yang benar-benar tersedia di `apps/web/public/icons`.
- Service worker tidak lagi menyimpan fallback `/index.html`; fallback sekarang memakai app shell `/` yang sesuai dengan Next.js.
- Header Netlify dibersihkan dari artifact PWA/Vite lama (`pwa-generated-sw.js`, `registerSW.js`, `/assets/*`).
- Artifact residual sudah tidak dipakai oleh build produksi dan archive lokal telah dibersihkan dari repository kerja.
- `LoginShell` dipisahkan dari panggilan auth langsung melalui `apps/web/src/next/lib/auth/client.ts`.
- Script audit baru tersedia di `corepack pnpm audit:project`.

## Struktur Web Saat Ini

- Production web: `apps/web`.
- Runtime route Next: `apps/web/app/*`.
- Visual/UI baseline: `apps/web/src`.
- Legacy reference tidak lagi disimpan sebagai folder archive; artifact yang masih diperlukan harus berada di source aktif.
- Shared cross-platform code: `packages/core` dan `packages/ui-tokens`.

## Area Besar yang Masih Perlu Dijaga

File berikut masih besar dan sebaiknya dipecah hanya saat ada perubahan fitur terkait:

- `apps/web/src/components/tagihan/TagihanLaporan.tsx`
- `apps/web/src/components/shared/BulkImportDialog.tsx`
- `apps/web/src/components/shared/ExportMenu.tsx`
- `apps/web/src/components/ImportExportButton.tsx`
- `apps/web/src/features/anime/pages/AnimePage.tsx`
- `apps/web/src/features/donghua/pages/DonghuaPage.tsx`
- `apps/web/src/features/anime/components/AnimeCard.tsx`
- `apps/web/src/features/donghua/components/DonghuaCard.tsx`

Catatan: tidak semua file besar adalah bug. Pemecahan berikutnya harus berbasis boundary perilaku: form state, import/export, report/export, media card actions, dan chart/report helpers.

## Pagination

Anime, Donghua, Waifu, dan Obat sudah memakai `useScrollToListStart` dengan anchor `listStartRef`, sehingga pergantian halaman diarahkan ke awal list/card, bukan ke awal halaman.

## Deployment Automation

- Netlify rebuild otomatis dari commit GitHub yang tersinkron ke repo production.
- Cloudflare Worker menggunakan origin Netlify. Workflow `.github/workflows/deploy-cloudflare.yml` akan deploy Worker saat ada push ke `main` jika secret `CLOUDFLARE_API_TOKEN` tersedia.
- Cache rule Cloudflare tetap harus menghormati header origin dan tidak boleh cache HTML, `sw.js`, auth, API, atau Supabase response secara agresif.

## Command Audit

```bash
corepack pnpm audit:project
corepack pnpm audit:migration-gate --strict
corepack pnpm audit:route-parity
corepack pnpm audit:edge
corepack pnpm typecheck
corepack pnpm build
```
