# LIVORIA Project Risk and Migration Audit

Generated: 2026-05-20

## Ringkasan Eksekutif

Audit saat ini menunjukkan Vite production masih build-safe, sementara Next preview sudah punya shell, request/session boundary, dashboard route, dan Obat read-only route. Migrasi total belum aman dilakukan sekaligus karena masih ada beberapa file besar dengan kombinasi UI, browser API, import/export, dan domain logic yang rawan regression.

Prioritas yang sudah ditangani dalam batch ini:

- Pagination Anime/Donghua/Waifu/Obat diarahkan ke anchor list/card, bukan awal halaman.
- Workflow sync diberi guard dry-run, source repo allowlist, mass delete guard, dan large sync guard.
- Audit script dipisah menjadi rules agar lebih mudah debugging.
- Next readiness audit dibuat dan menghasilkan dokumen otomatis.
- Next preview ditambah `proxy.ts` untuk session refresh boundary.
- Next preview ditambah `/obat` read-only sebagai route kecil pertama.
- Admin restore sekarang butuh konfirmasi eksplisit `RESTORE LIVORIA` di UI dan server.
- Telegram cron sekarang memvalidasi `chat_id` tujuan sebelum kirim pesan.
- Template pesan Telegram dibersihkan dari encoding rusak untuk mencegah pesan kacau di chat.

## Gate Migrasi Next

| Gate | Status | Catatan |
| --- | --- | --- |
| Next app shell | Aman | `apps/web-next/app/layout.tsx` tersedia. |
| Supabase SSR skeleton | Aman | Server/browser client sudah terpisah. |
| Request/session boundary | Aman | Next 16 memakai `apps/web-next/proxy.ts`. |
| Dashboard route | Ada | Masih shell/placeholder, belum parity penuh. |
| Obat route | Ada | Read-only preview, belum CRUD penuh. |
| Production switch | Belum aman | Vite tetap production sampai route parity selesai. |

## File Rawan Prioritas

| Prioritas | Area | Risiko utama | Rekomendasi pecah berikutnya |
| --- | --- | --- | --- |
| P0 | `supabase/functions/admin-backup/index.ts` | Restore dan auto backup sensitif, service role boundary. | Pecah auth guard, restore validator, backup writer, dan audit log. |
| P0 | `supabase/functions/telegram-tagihan/index.ts` | Target chat, reminder schedule, dan HTML message formatting. | Pecah command parser, subscription repository, reminder planner, dan message renderer. |
| P1 | `apps/web/src/components/shared/BulkImportDialog.tsx` | File sangat besar, parser/AI/review/insert bercampur. | Pecah parser adapter, review state, duplicate resolver, AI enrichment queue, dan insert adapter. |
| P1 | `apps/web/src/pages/Dashboard.tsx` | Statistik, payment action, chart, dan query bercampur. | Pindah summary repository/core formatter sebelum migrasi Next. |
| P1 | `apps/web/src/components/tagihan/TagihanForm.tsx` | Financial form dan preview cycle panjang. | Pecah payment method, schedule preview, validation adapter, dan cycle preview. |
| P1 | `apps/web/src/features/anime/pages/AnimePage.tsx` | Orchestrator masih besar walau feature sudah dipisah. | Pindah dialog state ke hook dan jadikan page route shell tipis. |
| P1 | `apps/web/src/features/donghua/pages/DonghuaPage.tsx` | Duplikasi pola Anime. | Share domain aman, tetap pertahankan label/icon Donghua. |
| P2 | `AnimeCard` / `DonghuaCard` | Browser API dan UI action padat. | Pecah cover media, progress badge, action menu, fan cover behavior. |
| P2 | `ImportExportButton` / `ExportMenu` / `TagihanExport` | Format file dan library berat rawan regression. | Standarkan schema import dan lazy action boundary. |

## Risiko Bug dan Potensi Bug

### Pagination

Masalah awal: perubahan halaman membawa user ke awal halaman, bukan awal area card.

Status:

- Anime, Donghua, Waifu, dan Obat memakai hook pagination berbasis route dengan scroll anchor.
- Risk scan masih menandai semua pemanggil pagination sebagai permukaan audit manual karena pola regex sengaja konservatif.
- Tagihan masih punya pagination internal `tpage`; perlu fase terpisah agar anchor behavior sama tanpa mengubah laporan/kalkulator.

### Telegram Bot

Risiko utama:

- Reminder cron perlu validasi waktu dan preferensi user secara eksplisit.
- Message HTML harus escape data user.
- Target chat harus berasal dari subscription aktif milik user yang tepat.
- Frontend action seperti register/update preference tidak boleh mengubah subscription user lain.

Status batch lanjutan:

- `chat_id` dari webhook, register, test, dan cron dinormalisasi sebelum dipakai.
- Cron melewati subscription dengan `chat_id` tidak valid.
- Laporan bulanan memakai tanggal aman 1-28 agar reminder tidak hilang pada bulan pendek.
- Output pesan utama dan report sudah diganti ke teks ASCII/HTML yang lebih stabil.

Rekomendasi pecah:

```text
supabase/functions/telegram-tagihan/
  command-parser.ts
  reminder-planner.ts
  subscription.repository.ts
  message-renderer.ts
  telegram-client.ts
```

### Bahasa Backend di UI

Audit menemukan beberapa copy/komentar UI yang masih memakai istilah seperti Supabase, database, schema, dan RPC. Untuk Admin masih bisa diterima, tetapi untuk user biasa sebaiknya diganti menjadi bahasa produk seperti "data", "backup", "format file", atau "konfigurasi".

### Import/Export

Risiko utama:

- Roundtrip JSON/CSV/XLSX harus tetap kompatibel.
- Relasi `tagihan_history` dan `struk` tidak boleh putus.
- Library berat sudah lazy pada beberapa jalur, tetapi chunk build masih menunjukkan `xlsx`, `jspdf`, dan chart sebagai area ukur bundle.

### Next Migration

Migrasi total belum disarankan sekarang. Jalur aman:

1. Finalisasi Obat Next CRUD.
2. Pindahkan Dashboard summary read-only dengan RPC/fallback yang sudah ada.
3. Pindahkan Waifu setelah storage upload boundary stabil.
4. Pecah Settings menjadi panels sebelum migrasi.
5. Pindahkan Anime/Donghua setelah card/page lebih kecil.
6. Pindahkan Tagihan terakhir setelah financial server action dan test pembayaran kuat.

## Artifact Debugging

Command yang tersedia:

```bash
corepack pnpm audit:risk
corepack pnpm audit:next -- --markdown docs/audits/2026-05-20-next-migration-readiness.md
corepack pnpm next:typecheck
corepack pnpm next:build
corepack pnpm check
```

Dokumen audit otomatis:

- `docs/audits/2026-05-20-next-migration-readiness.md`

Script audit:

- `scripts/audit/livoria-risk-scan.mjs`
- `scripts/audit/livoria-risk-rules.mjs`
- `scripts/audit/livoria-next-readiness.mjs`

## Keputusan Migrasi

Vite tetap menjadi production web saat ini. Next preview diperlakukan sebagai enterprise migration lane, bukan replacement mendadak. Semua route Next baru harus punya repository/server action terpisah, loading/error/empty state, dan parity checklist sebelum mengubah deployment production.
