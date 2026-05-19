# LIVORIA Project Risk Audit - 2026-05-19

Audit ini mencakup Web Vite production, Next preview, Supabase Edge Functions, Telegram bot, dan shared packages. Audit dilakukan tanpa deploy dan tanpa mengubah target production Netlify.

## Ringkasan Eksekutif

Status saat audit:

- Web production masih `apps/web` berbasis Vite.
- Next.js masih preview di `apps/web-next`.
- RN/Flutter masih prototype.
- Repository berada dalam worktree dirty dari fase migrasi sebelumnya.

Perubahan langsung yang sudah dilakukan dalam pass ini:

- Pagination Tagihan diarahkan ke awal daftar/card, bukan awal halaman.
- Anime/Donghua memakai hook shared `useScrollToListStart`.
- Floating tombol tambah sekarang berlaku untuk `Tagihan`, `Anime`, `Donghua`, `Waifu`, dan `Obat`. Dashboard tetap tidak punya tombol tambah.
- Telegram Edge Function menolak Chat ID aktif milik user lain dan memperlakukan kegagalan `sendMessage` sebagai error.
- SQL hardening manual ditambahkan untuk unique active Telegram Chat ID.
- Script audit repeatable ditambahkan: `corepack pnpm audit:risk`.

## Temuan Utama

| Area | Status | Risiko | Catatan |
| --- | --- | --- | --- |
| Telegram targeting | Dipatch sebagian | Tinggi | Guard app-level sudah ada. Unique partial index masih perlu dipasang manual lewat SQL. |
| Telegram reminder logic | Perlu refactor | Tinggi | `generateReport` menghitung tempo sendiri, belum memakai domain logic Tagihan yang sudah dites. Risiko drift. |
| Supabase langsung di UI | Ada | Tinggi | Audit script menemukan 55 pola. Beberapa adalah legacy/admin/import besar; refactor bertahap via repository. |
| Bahasa backend di web | Ada | Medium | Audit script menemukan 167 pola. Banyak false positive dari komentar/icon, tetapi beberapa copy user-facing masih menyebut database/schema/Supabase. |
| Formatter inline | Ada | Medium | 68 pola `Intl.NumberFormat` / `toLocaleDateString`. Gunakan formatter shared saat file disentuh. |
| Pagination | Dipatch untuk target utama | Medium | Anime/Donghua sudah anchor list, Tagihan dipatch. Obat/Waifu belum punya pagination. |
| Encoding/mojibake | Ada | Medium | Beberapa file punya artefak `â...`, `Â...`; perlu cleanup bertahap agar UI/bot tidak terlihat rusak. |
| Next migration | Aman sebagai preview | Medium | Jangan pindahkan production sampai auth/session/repository parity selesai. |

## Detail Telegram

Sudah diperbaiki:

- `sendMessage` sekarang throw jika Telegram API gagal.
- `/start` dan command lookup memakai `maybeSingle()` untuk menghindari error saat belum ada row.
- `register` dan `test` menolak Chat ID yang sudah aktif untuk user lain.
- `register` mengirim pesan terlebih dahulu sebelum menyimpan koneksi, sehingga Chat ID yang tidak bisa dikirimi pesan tidak langsung tersimpan.

Masih perlu:

- Jalankan `docs/sql/17-telegram-targeting-hardening.sql` secara manual setelah cek duplikasi.
- Ekstrak logic tempo/overdue Telegram agar memakai domain Tagihan yang sama dengan UI.
- Tambahkan dry-run action untuk cron, misalnya `daily_reminder_preview`, agar admin bisa melihat target sebelum cron mengirim.
- Tambahkan hasil ringkas cron: total subscription diproses, terkirim, dilewati, gagal.

## Detail Pagination

Target UX:

- Saat user klik pagination, scroll diarahkan ke awal daftar/card.
- Scroll tidak kembali ke header/page top.

Status:

- `AnimePage` dan `DonghuaPage` memakai `useScrollToListStart`.
- `TagihanList` punya anchor lokal sebelum tabel/card.
- Pagination mobile Tagihan juga memakai anchor yang sama.

Sisa:

- Jika Obat/Waifu nanti diberi pagination, wajib memakai hook yang sama.
- Shared `Pagination` belum memaksa scroll karena target anchor berbeda per feature; parent harus tetap memberi target.

## Detail Tombol Tambah

Floating add button sekarang mencari trigger:

- `[data-add-trigger="tagihan"]`
- `[data-add-trigger="anime"]`
- `[data-add-trigger="donghua"]`
- `[data-add-trigger="waifu"]`
- `[data-add-trigger="obat"]`

Behavior tetap memakai tombol asli page. Ini penting karena setiap page punya state reset/form sendiri.

## Debug Artifact

Command:

```bash
corepack pnpm audit:risk
```

Output JSON berisi:

- `ui-direct-supabase`
- `backend-language-ui`
- `inline-id-formatters`
- `encoding-mojibake`
- `pagination-scroll-anchor`
- `telegram-targeting`

Gunakan output ini sebagai daftar kandidat, bukan kebenaran mutlak. Ada false positive dari komentar, nama icon, dan halaman admin.

## Next.js Migration Bertahap

Prinsip:

- `apps/web` tetap production.
- `apps/web-next` hanya preview sampai route punya parity.
- Migrasi dilakukan route-by-route, bukan copy seluruh Vite app.

Urutan yang disarankan:

1. Stabilkan auth/session Next dengan middleware refresh.
2. Migrasikan dashboard read-only memakai repository summary.
3. Migrasikan Settings read-only subset.
4. Migrasikan Obat karena sudah paling kecil dan repository pattern stabil.
5. Baru pertimbangkan Waifu.
6. Tunda Tagihan/Anime/Donghua sampai domain logic dan import/export benar-benar modular.

Gate sebelum route production dipindah:

- Web Vite `corepack pnpm check` tetap hijau.
- Next `corepack pnpm next:build` hijau.
- Route punya loading/error/empty state.
- Supabase access lewat repository/server boundary yang jelas.
- Tidak ada service role atau secret di client.

## Prioritas Remediasi Berikutnya

P0:

- Pasang SQL unique active Chat ID Telegram setelah cek duplikasi.
- Buat dry-run cron Telegram.
- Bersihkan mojibake pada string Telegram dan UI utama.

P1:

- Refactor `TelegramSettings` dari direct Supabase read ke repository/edge action.
- Ekstrak Telegram report calculation ke shared domain atau RPC yang teruji.
- Kurangi direct Supabase import di `BulkImportDialog`, `Settings`, dan `Auth`.

P2:

- Migrasi formatter inline ke `@livoria/core` atau shared formatter.
- Ubah copy user-facing dari "database/schema/Supabase" menjadi istilah produk seperti "arsip", "data", "validasi", "server".
- Tambahkan audit script mode `--fail-on high` untuk CI setelah false positive dikurangi.
