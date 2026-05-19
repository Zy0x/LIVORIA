# PHASE 1 Security Hotfix Foundation

Tanggal audit: 2026-05-19

## Ringkasan

Phase ini memperkuat titik risiko terbesar tanpa refactor besar:

- Admin backup tidak lagi menganggap `isAuto` sebagai izin.
- Backup otomatis harus membawa secret server-to-server melalui header `x-livoria-cron-secret`.
- Edge Function admin/AI menolak method selain `POST` dan `OPTIONS`.
- Action admin backup dan AI title dibatasi ke allowlist.
- Error internal Edge Function dicatat di log server, tetapi tidak dikirim mentah ke client.
- Upload storage tetap diawali `user.id`; upload struk sekarang masuk ke folder `user.id/struk/<tagihanId>/...`.
- Bucket waifu dikunci ke nama `waifu`, sesuai `docs/sql/08-storage.sql`.
- Bucket `struk` tetap private dan file dibaca melalui signed URL.

## Secret Baru/Didukung

Untuk backup otomatis, pakai salah satu secret berikut di Supabase Edge Function:

1. `ADMIN_CRON_SECRET`
2. `BACKUP_CRON_SECRET`
3. `AUTO_BACKUP_SECRET` (legacy fallback)
4. `CRON_SECRET` (legacy fallback)

Rekomendasi utama: pakai `ADMIN_CRON_SECRET` atau `BACKUP_CRON_SECRET`, lalu kirim via header:

```http
x-livoria-cron-secret: <secret>
```

Body cron cukup:

```json
{
  "action": "backup"
}
```

`isAuto` tidak boleh dipakai sebagai izin. Jika `isAuto` dikirim tanpa secret valid, request ditolak.

## CORS

Edge Function sensitif sekarang membaca allow-origin dari env:

- `ADMIN_ALLOWED_ORIGIN` untuk `admin-auth` dan `admin-backup`.
- `AI_ALLOWED_ORIGIN` untuk `ai-titles` dan `bulk-import-ai`.
- `ALLOWED_ORIGIN` sebagai fallback umum.

Jika env tersebut belum diatur, function masih fallback ke `*` agar production tidak langsung putus. Untuk production, isi origin dengan domain resmi, misalnya:

```text
ADMIN_ALLOWED_ORIGIN=https://livoria.netlify.app
AI_ALLOWED_ORIGIN=https://livoria.netlify.app
```

## Storage

Status saat ini:

- `covers`: public, path wajib diawali `user.id`.
- `waifu`: public, path wajib diawali `user.id`.
- `struk`: private, path wajib diawali `user.id`, akses file lewat signed URL.

Kode upload image hanya menerima bucket public yang diketahui:

- `covers`
- `waifu`

Ini mencegah penggunaan tidak sengaja bucket lama seperti `waifu-images`.

## SQL Pendukung

File pendukung:

- `docs/sql/15-storage-security-hotfix.sql`

Tujuannya:

- Memastikan bucket `struk` private.
- Memastikan bucket `waifu` konsisten dengan kode.
- Menambahkan policy `UPDATE` untuk object milik user sendiri agar upload `upsert` tidak gagal saat object diganti.

Jalankan SQL ini di Supabase SQL Editor setelah review. Perubahan ini tidak dijalankan otomatis oleh Codex pada phase ini.

## Risiko Tersisa

- `ADMIN_ALLOWED_ORIGIN` dan `AI_ALLOWED_ORIGIN` harus dikonfigurasi di Supabase agar CORS benar-benar tidak wildcard.
- Jika scheduler lama masih mengirim hanya `{ "action": "backup", "isAuto": true }` tanpa secret, backup otomatis akan ditolak. Update scheduler agar mengirim header secret.
- Policy Storage di database production perlu dicek setelah SQL pendukung dijalankan.

## Checklist Manual

1. Set `ADMIN_CRON_SECRET` atau `BACKUP_CRON_SECRET` di Supabase secrets.
2. Set `ADMIN_ALLOWED_ORIGIN` dan `AI_ALLOWED_ORIGIN`.
3. Deploy ulang Edge Functions yang berubah.
4. Panggil `admin-backup` action `backup` tanpa secret dan pastikan mendapat `401`.
5. Panggil `admin-backup` action `backup` dengan header secret valid dan pastikan backup sukses.
6. Upload struk baru dan pastikan path di tabel `struk.file_url` berbentuk `userId/struk/tagihanId/timestamp-random.ext`.
7. Buka bukti struk dari UI dan pastikan signed URL tetap tampil.
