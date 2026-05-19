# Panduan Konfigurasi Admin & Backup Otomatis - LIVORIA

Dokumen ini berisi langkah-langkah untuk mengonfigurasi sistem Admin terpadu dan fitur backup otomatis 7 hari.

## 1. Konfigurasi Supabase Secrets

Fitur Admin dan Backup memerlukan beberapa environment variables (secrets) yang harus diatur di Supabase Dashboard (**Project Settings > API**) atau via CLI:

| Secret Name | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `ADMIN_EMAIL` | Email yang digunakan untuk login admin | `admin@livoria.com` |
| `ADMIN_KEY` | Password/Key khusus untuk akses admin | `RahasiaAdmin123!` |
| `SUPABASE_URL` | URL Proyek Supabase Anda | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Key Service Role (Sangat Rahasia) | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `ADMIN_CRON_SECRET` atau `BACKUP_CRON_SECRET` | Secret khusus untuk backup otomatis server-to-server | `random-long-secret` |
| `ADMIN_ALLOWED_ORIGIN` | Origin web yang boleh memanggil admin function dari browser | `https://livoria.netlify.app` |

## 2. Persiapan Database (SQL)

Jalankan script SQL berikut di **SQL Editor** Supabase untuk membuat tabel backup dan fungsi pembantu:

```sql
-- 1. Tabel untuk menyimpan riwayat backup
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Aktifkan RLS (tanpa policy agar hanya bisa diakses service role)
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- 2. Fungsi untuk mendeteksi tabel secara dinamis
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE (table_name text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
END;
$$;
```

## 3. Deployment Edge Functions

Pastikan Edge Functions berikut sudah di-deploy:
1.  `admin-auth`: Untuk validasi login admin tersembunyi.
2.  `admin-backup`: Untuk proses backup, list riwayat, dan restore.

## 4. Konfigurasi Backup Otomatis (Cron)

Untuk menjalankan backup otomatis setiap hari, Anda bisa menggunakan **Supabase Edge HTTP Cron** (jika tersedia di plan Anda) atau layanan eksternal seperti GitHub Actions atau Cron-job.org untuk memanggil URL function `admin-backup` setiap hari:

**Endpoint:** `https://<project-ref>.supabase.co/functions/v1/admin-backup`
**Method:** `POST`
**Header:**
```http
x-livoria-cron-secret: <ADMIN_CRON_SECRET atau BACKUP_CRON_SECRET>
```
**Body:**
```json
{
  "action": "backup"
}
```

## 5. Cara Login Admin

Halaman login admin sekarang **tersembunyi** di dalam halaman Auth biasa:
1.  Buka halaman Login.
2.  Masukkan `ADMIN_EMAIL` dan `ADMIN_KEY` yang telah Anda atur di secrets.
3.  Sistem akan otomatis mendeteksi kredensial admin dan mengarahkan Anda ke **Panel Admin** alih-alih Dashboard pengguna biasa.

---

**Keamanan:**
*   Tombol "Login Admin" telah dihapus untuk mencegah pihak luar mengetahui adanya panel admin.
*   Sistem backup menggunakan `SERVICE_ROLE_KEY` yang hanya ada di sisi server (Edge Function), sehingga aman dari akses client-side.
*   Restore data memerlukan konfirmasi ganda di UI untuk mencegah kesalahan fatal.
