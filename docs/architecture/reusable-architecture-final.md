# LIVORIA Reusable Architecture Final

Dokumen ini merangkum kontrak lintas platform setelah Phase 20-21. Tujuannya mencegah duplikasi logic bisnis di UI dan menjaga Web, React Native, Next preview, dan Flutter mengikuti pola yang sama tanpa memaksa satu runtime mengimpor bahasa lain.

## Sumber Reusable Saat Ini

### TypeScript Shared Contract

`packages/core` adalah sumber reusable untuk platform TypeScript:

- `ApiError`
- `Pagination`
- `PaginatedResult<T>`
- `DashboardSummary`
- `ObatItem`
- `TagihanStatus`
- `MediaStatus`
- `WatchStatus`
- `TAGIHAN_STATUSES`
- `MEDIA_STATUSES`
- `WATCH_STATUSES`
- `formatCurrencyIDR`
- `formatCompactIDR`
- `formatDateID`
- `normalizeObatItem`
- `buildUserStoragePath`
- `sanitizeStorageSegment`
- `getStorageExtension`

Pengguna utama:

- `apps/mobile-rn`
- `apps/web-next`
- package TypeScript baru yang tidak bergantung pada DOM/React/Supabase

### Web Shared Domain

`apps/web/src/shared` masih menjadi compatibility layer untuk Vite app selama migrasi bertahap:

- `shared/domain/tagihan/*` untuk logic tagihan murni.
- `shared/domain/anime/title-grouping.ts` untuk grouping judul.
- `shared/domain/storage/storage-path.ts` untuk path storage.
- `shared/formatters/*` untuk formatter web existing.
- `shared/constants/status.ts` untuk enum status web existing.

Belum semua dipindah ke `packages/core` karena beberapa file masih punya pemanggil legacy yang luas. Pemindahan berikutnya harus dilakukan dengan re-export shim dan test.

### Flutter Contract

`apps/mobile-flutter` tidak mengimpor TypeScript. Flutter mengikuti kontrak yang sama dalam model Dart:

- `ApiError`
- `Pagination`
- `PaginatedResult<T>`
- `DashboardSummary`
- `Obat`
- `formatCurrencyIDR`
- `formatCompactIDR`
- `formatDateID`
- `ObatRepository`

Kontrak Dart harus disinkronkan dengan dokumen dan test, bukan dengan import langsung dari `packages/core`.

## Audit Anti-Redundancy

### Currency Format

Status:

- Ada reusable `formatCurrencyIDR` di `packages/core`.
- Web legacy masih punya beberapa formatter lokal di halaman/komponen tagihan lama.
- Flutter punya implementasi Dart sendiri karena tidak reuse TypeScript.

Keputusan:

- Untuk TypeScript baru, gunakan `@livoria/core`.
- Untuk Web legacy, migrasi bertahap per komponen saat file disentuh agar tidak memicu regresi UI besar.

### Date Format

Status:

- `packages/core` menyediakan `formatDateID`.
- Web masih banyak memakai `toLocaleDateString('id-ID')` inline untuk variasi label tanggal.
- Flutter punya `formatDateID` Dart.

Keputusan:

- Tanggal display umum harus memakai formatter shared.
- Tanggal domain tagihan yang memengaruhi pesan reminder tetap diuji sebelum dipindah.

### Tagihan Calculation

Status:

- Logic penting sudah diekstrak di `apps/web/src/shared/domain/tagihan` dan `apps/web/src/features/tagihan/domain`.
- Tests tagihan sudah ada di Web.

Keputusan:

- Jangan port otomatis ke Flutter/RN sampai contract dan test lintas platform disepakati.
- Jika dipindah ke `packages/core`, lakukan satu file pure-domain per PR/phase dan pertahankan compatibility re-export.

### Title Grouping

Status:

- Logic grouping ada di `apps/web/src/shared/domain/anime/title-grouping.ts`.
- Anime/Donghua feature punya adapter/domain lokal.

Keputusan:

- Aman dipromosikan ke `packages/core` pada phase kecil berikutnya jika semua import legacy memakai shim.

### Status Enum

Status:

- Status enum tersedia di `packages/core`.
- Web existing masih punya `apps/web/src/shared/constants/status.ts` dan union lokal di beberapa komponen legacy.

Keputusan:

- TypeScript baru memakai `@livoria/core`.
- Web legacy dikurangi saat komponen terkait disentuh.

### Storage Path

Status:

- `packages/core` punya helper path storage pure.
- Web shared masih punya helper legacy yang sama untuk compatibility.

Keputusan:

- Upload baru harus memakai helper pure yang menghasilkan path `<user_id>/<folder>/<timestamp-suffix>.<ext>`.
- Jangan menaruh service role atau policy bypass di client.

### Error Mapping

Status:

- `ApiError` contract tersedia di `packages/core` dan Dart.
- Mapping error UI masih tersebar di beberapa page/komponen.

Keputusan:

- Repository layer mengembalikan/mapping error terstruktur.
- UI hanya menampilkan pesan, bukan membaca shape Supabase mentah jika repository sudah tersedia.

## Reusable Final

- Contract data: `ApiError`, `Pagination`, `DashboardSummary`, `Obat`.
- Formatter umum: currency/date/compact currency.
- Status enum: tagihan/media/watch.
- Storage path helper murni.
- Obat normalization.
- Repository pattern: UI -> hook/screen -> repository -> client.

## Platform-Specific Final

- Web Vite: production UI, React Query, shadcn/Radix, PWA, import/export lengkap.
- Next preview: App Router shell dan Supabase SSR skeleton.
- React Native: Expo shell, navigation placeholder, memory storage placeholder.
- Flutter: Dart contract model, repository interface, placeholder Obat feature.
- Supabase client setup: harus platform-specific karena env, storage, cookies, dan auth persistence berbeda.

## Technical Debt Tersisa

- Web legacy masih punya inline currency/date formatter di beberapa komponen Tagihan, Dashboard, Admin.
- Anime/Donghua masih memiliki beberapa union status lokal di UI lama.
- `title-grouping` belum dipromosikan penuh ke `packages/core`.
- Tagihan calculation belum menjadi package core lintas platform.
- Flutter belum memakai `supabase_flutter`.
- RN belum memakai AsyncStorage/SecureStore.
- Next belum punya middleware session refresh dan protected routes.

## Checklist Manual Untuk Future AI Agent

Sebelum menambah logic baru:

1. Cek apakah logic bisa pure dan masuk `packages/core`.
2. Jangan import React, DOM, router, toast, Supabase, localStorage, atau window dari core.
3. Jika Flutter butuh logic yang sama, buat implementasi Dart contract-parallel dan test.
4. Jika logic menyentuh uang/tagihan, tambahkan test sebelum mengubah output.
5. Jika logic menyentuh storage, pastikan path diawali `user_id`.
6. Jika logic menyentuh Supabase, repository boleh import client, UI tidak.
7. Jika logic hanya presentasi UI, biarkan di platform.
8. Jika memindahkan legacy Web import, pakai compatibility re-export dan jalankan `corepack pnpm check`.
9. Jangan mengubah Netlify production target saat menambah preview app.
10. Jangan commit/push/deploy tanpa perintah eksplisit.
