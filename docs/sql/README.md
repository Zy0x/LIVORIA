# LIVORIA — SQL Database Schema

Dokumentasi lengkap skema database Supabase untuk LIVORIA.

## Daftar Tabel
1. [tagihan](./01-tagihan.sql) — Manajemen hutang/piutang
2. [tagihan_history](./02-tagihan-history.sql) — Riwayat aksi pada tagihan
3. [struk](./03-struk.sql) — Bukti pembayaran (file upload)
4. [anime](./04-anime.sql) — Database anime
5. [donghua](./05-donghua.sql) — Database donghua
6. [waifu](./06-waifu.sql) — Tier list karakter
7. [obat](./07-obat.sql) — Catatan obat-obatan
8. [storage](./08-storage.sql) — Konfigurasi storage buckets
9. [rls-policies](./09-rls-policies.sql) — Row Level Security policies

10. [storage-security-hotfix](./15-storage-security-hotfix.sql) - Hardening bucket `struk`, `waifu`, dan policy update object milik user
11. [dashboard-summary-rpc](./16-dashboard-summary-rpc.sql) - RPC summary dashboard dengan fallback frontend
12. [telegram-targeting-hardening](./17-telegram-targeting-hardening.sql) - Guard agar satu Chat ID Telegram aktif tidak dipakai beberapa user
13. [record-tagihan-payment-rpc](./18-record-tagihan-payment-rpc.sql) - RPC pembayaran atomik untuk update Tagihan + history dalam satu transaksi

## Konvensi
- Semua tabel memiliki kolom `id` (UUID, primary key, auto-generated)
- Semua tabel memiliki kolom `user_id` (UUID, FK ke auth.users)
- Semua tabel memiliki kolom `created_at` (timestamp with time zone)
- RLS diaktifkan pada semua tabel
- Policy: user hanya bisa akses data milik sendiri
