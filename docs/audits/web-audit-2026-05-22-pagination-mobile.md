# LIVORIA Web Audit - Pagination, Mobile Load, and Next Readiness

Tanggal: 2026-05-22

## Perbaikan yang Dikerjakan

- Pagination Anime, Donghua, Waifu, dan Obat sekarang memakai deferred list scroll.
- Scroll pagination tidak lagi dieksekusi langsung di event klik, tetapi dijadwalkan lalu di-flush setelah page/card render stabil.
- Anchor list/card diberi `data-list-start-anchor` agar debugging posisi scroll lebih mudah.
- Offset scroll dihitung dari tinggi sticky header `.header-blur`, bukan angka tetap besar yang mudah meleset di desktop.
- Splash screen dan PWA manager dilazy-load agar initial mobile bundle lebih ringan.
- Splash screen hanya tampil sekali per sesi dan dilewati di perangkat mobile/low-motion.
- Floating scroll/add control dilazy-load dari layout dan sinkron dengan event `livoria-splash-complete`.
- GSAP entry animation pada Waifu/Obat tidak lagi static import dan dilewati pada perangkat low-motion.
- Dead code progress-circle pada Anime/Donghua dihapus karena ref tidak pernah dirender.
- Audit guard floating action diperbarui agar mengenali pola baru: tombol `+` tetap di bawah, tombol scroll yang bergerak.

## Status Validasi

- `corepack pnpm --filter @livoria/web typecheck`: pass.
- `corepack pnpm --filter @livoria/web build`: pass.
- `corepack pnpm test`: 15 files / 48 tests pass.
- `corepack pnpm check`: pass.
- `corepack pnpm audit:project`: high severity 0.
- `corepack pnpm audit:migration-gate --strict`: pass, `totalNextMigrationReady: true`.
- `corepack pnpm audit:route-parity`: semua route native Next dan parity-complete.
- `corepack pnpm audit:edge`: 15/15 gates pass.

## Audit Terkini

### Aman / Siap

- Production build sudah Next, bukan Vite.
- Legacy parity bridge tidak aktif.
- Netlify publish mengarah ke `apps/web/.next`.
- Cloudflare menggunakan Next proxy worker.
- Tidak ada residual path publik Vite/PWA generated legacy.
- Telegram Edge Function lolos guard chat-id normalization, cron secret, webhook secret readiness, dan helper split.
- Admin backup/restore lolos guard confirmation phrase, cron-scope, allowlist restore, dan UTF-8.

### Risiko yang Masih Perlu Diprioritaskan

- Masih ada 21 file web source di atas 500 baris. Ini bukan blocker migrasi, tetapi masih meningkatkan biaya debugging.
- File paling perlu dipilah berikutnya:
  - `apps/web/src/components/shared/AnimeExtraFields.tsx`
  - `apps/web/src/components/shared/ExportMenu.tsx`
  - `apps/web/src/components/tagihan/TagihanLaporan.tsx`
  - `apps/web/src/components/ImportExportButton.tsx`
  - `apps/web/src/components/tagihan/TagihanFormAdvancedSections.tsx`
  - `apps/web/src/features/anime/components/AnimeCard.tsx`
  - `apps/web/src/features/donghua/components/DonghuaCard.tsx`
  - `apps/web/src/components/shared/BulkImportDialog.tsx`
- `audit:risk` masih menandai banyak formatter `id-ID` inline. Ini tidak otomatis bug, tetapi formatter shared sebaiknya dipakai konsisten untuk angka, tanggal, dan currency lint manual.
- `audit:risk` masih menandai pagination anchor sebagai low risk karena pola deteksinya luas. Implementasi utama sudah memakai deferred scroll + anchor, tetapi scanner bisa dibuat lebih presisi nanti.
- Beberapa komponen global masih static import GSAP saat rute terkait dimuat, terutama export/report/tagihan/PWA detail. Kandidat optimasi berikutnya: dynamic import GSAP di `ImportExportButton`, `ExportMenu`, dan komponen report Tagihan.
- `apps/web/next.config.ts` masih memiliki `typescript.ignoreBuildErrors: true`; typecheck manual sudah menjadi gate, tetapi konfigurasi ini sebaiknya dimatikan setelah debt TypeScript benar-benar bersih.

## Rekomendasi Berikutnya

1. Pecah surface export/import dan report Tagihan karena file besar dan sering menyentuh dependency berat.
2. Standardisasi formatter tanggal/currency ke helper shared secara bertahap, mulai dari Tagihan dan Dashboard.
3. Jadikan `audit:risk` lebih presisi supaya warning pagination tidak menghasilkan noise setelah deferred anchor pattern stabil.
4. Kurangi static GSAP pada komponen yang hanya muncul setelah user action.
5. Matikan `typescript.ignoreBuildErrors` di Next config setelah satu putaran strict type cleanup.
