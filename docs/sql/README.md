# LIVORIA - SQL Database Schema

Dokumentasi ringkas skema database Supabase untuk LIVORIA.

## Daftar Tabel

1. [tagihan](./01-tagihan.sql) - Manajemen hutang/piutang
2. [tagihan_history](./02-tagihan-history.sql) - Riwayat aksi pada tagihan
3. [struk](./03-struk.sql) - Bukti pembayaran
4. [anime](./04-anime.sql) - Database anime
5. [donghua](./05-donghua.sql) - Database donghua
6. [waifu](./06-waifu.sql) - Tier list karakter
7. [obat](./07-obat.sql) - Catatan obat-obatan
8. `catatan` - Catatan pribadi, dibuat lewat migration `supabase/migrations/20260531090713_livoria_catatan_feature.sql`
9. [storage](./08-storage.sql) - Konfigurasi storage buckets
10. [rls-policies](./09-rls-policies.sql) - Row Level Security policies
11. [storage-security-hotfix](./15-storage-security-hotfix.sql) - Hardening bucket `struk`, `waifu`, dan policy update object milik user
12. [dashboard-summary-rpc](./16-dashboard-summary-rpc.sql) - RPC summary dashboard dengan fallback frontend
13. [telegram-targeting-hardening](./17-telegram-targeting-hardening.sql) - Guard agar satu Chat ID Telegram aktif tidak dipakai beberapa user
14. [record-tagihan-payment-rpc](./18-record-tagihan-payment-rpc.sql) - RPC pembayaran atomik untuk update Tagihan + history dalam satu transaksi

## Konvensi

- Semua tabel memiliki kolom `id` berupa UUID primary key.
- Semua tabel data pengguna memiliki kolom `user_id`.
- RLS diaktifkan pada tabel data pengguna.
- Policy utama: user hanya bisa mengakses data milik sendiri.
