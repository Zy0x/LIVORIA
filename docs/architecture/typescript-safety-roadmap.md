# TypeScript Safety Roadmap

Dokumen ini mencatat batas aman Phase 13 agar type safety naik bertahap tanpa memaksa strict mode penuh dan memicu regresi besar.

## Status Phase 13

- `strict`, `strictNullChecks`, dan `noImplicitAny` tetap belum diaktifkan karena halaman legacy dan payload import/export masih membutuhkan migrasi bertahap.
- `noUnusedLocals` dan `noUnusedParameters` sudah diuji lewat command TypeScript override, tetapi belum aman untuk dinyalakan di config karena masih banyak unused import/local di surface legacy besar.
- Area yang sudah mulai diketatkan: admin stats/users/backups, dashboard summary query, navigation item route, tooltip chart, dan sebagian import/export catch typing.
- Lanjutan Phase 13 memperketat auth return type, Telegram settings error handling, Supabase row mapper Anime/Donghua/Tagihan, import/export normalization, settings backup/import payload, media card helpers, dan migration gate untuk mengabaikan generated Supabase types.
- Root `pnpm check` sudah melewati typecheck, build, migration gate strict, route parity, dan packages check setelah high-risk generated/manual file gate dibersihkan.

## Roadmap Aman

1. Selesaikan unused import/local di halaman besar: Anime, Donghua, Tagihan form/report, dan BulkImportDialog.
2. Tambahkan tipe payload import/export per feature sebelum menyalakan `noImplicitAny`.
3. Audit form state dan mapper untuk nilai null sebelum menyalakan `strictNullChecks`.
4. Setelah tiga langkah di atas bersih, aktifkan `noUnusedLocals` dan `noUnusedParameters` terlebih dahulu.
5. Aktifkan strict mode penuh hanya setelah route utama lolos smoke test dan build.

## Area Ditunda

- Payload AI/import CSV masih dinamis dan perlu schema-based narrowing per feature.
- Admin backup restore masih menerima struktur backup fleksibel dari Edge Function.
- Beberapa komponen lama masih memakai props longgar agar behavior tidak berubah saat phase refactor berjalan.
- Sisa `any` yang sengaja ditunda terutama berada di search API response Jikan/AniList, BulkImportDialog step props, dan beberapa media dialog/form generic yang perlu pemecahan komponen lanjutan.
