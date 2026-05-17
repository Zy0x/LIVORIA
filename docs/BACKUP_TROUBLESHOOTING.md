# Panduan Troubleshooting Sistem Backup Otomatis - LIVORIA

## Masalah: "Could not retrieve Supabase secrets from vault. Cron job not updated."

Pesan error ini menunjukkan bahwa fungsi `manage_backup_cron_job()` tidak dapat mengakses rahasia Supabase dari Vault. Ini adalah masalah umum yang terjadi karena beberapa alasan.

---

## Penyebab dan Solusi

### 1. **Vault Secrets Belum Diatur**

**Penyebab:** Anda belum menambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` ke Supabase Vault.

**Solusi:**

1. Buka **Supabase Dashboard** → **Project Settings** → **API**
2. Cari bagian **Secrets** atau **Vault** (tergantung versi Supabase)
3. Tambahkan dua secret baru:
   - **Name:** `SUPABASE_URL` | **Value:** `https://xyz.supabase.co` (ganti `xyz` dengan project ref Anda)
   - **Name:** `SUPABASE_ANON_KEY` | **Value:** (copy dari bagian "anon public" di API settings)

4. Setelah menambahkan, jalankan ulang setup backup dengan menjalankan SQL di bawah.

---

### 2. **Izin Akses Vault Terbatas**

**Penyebab:** Role database Anda tidak memiliki akses ke `supabase_vault.secrets`.

**Solusi:**

Gunakan versi **FIXED** dari scheduler yang memiliki fallback mechanism:

```sql
-- Jalankan file ini di SQL Editor Supabase
-- docs/sql/14-dynamic-backup-scheduler-FIXED.sql
```

Versi FIXED ini memiliki 3 strategi untuk mengambil secrets:
1. Coba dari Vault (jika tersedia)
2. Gunakan parameter yang dikirim dari frontend
3. Gunakan secrets yang tersimpan di tabel `backup_settings`

---

### 3. **Menggunakan Fallback Manual Setup**

Jika Vault tetap tidak dapat diakses, Anda bisa mengatur backup dengan cara manual:

#### Step 1: Jalankan SQL ini untuk menyimpan secrets di database

```sql
UPDATE public.backup_settings
SET supabase_url = 'https://xyz.supabase.co',
    supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
```

**Catatan:** Ganti nilai dengan URL dan key Anda yang sebenarnya.

#### Step 2: Jalankan fungsi initialization

```sql
SELECT public.initialize_backup_with_secrets(
  'https://xyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);
```

#### Step 3: Verifikasi

```sql
SELECT * FROM public.backup_settings;
SELECT * FROM cron.job WHERE jobname = 'daily-auto-backup';
SELECT * FROM public.backup_logs ORDER BY execution_time DESC LIMIT 5;
```

---

### 4. **Extensions Tidak Diaktifkan**

**Penyebab:** `pg_cron` atau `pg_net` extension belum diaktifkan.

**Solusi:**

Jalankan di SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Jika mendapat error "permission denied", hubungi Supabase support untuk mengaktifkan extensions ini.

---

## Verifikasi Setup Berhasil

Setelah menjalankan salah satu solusi di atas, jalankan query ini untuk memverifikasi:

```sql
-- 1. Cek backup_settings
SELECT id, is_enabled, backup_time, timezone, cron_job_id, supabase_url, updated_at 
FROM public.backup_settings;

-- 2. Cek cron job di sistem
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'daily-auto-backup';

-- 3. Cek log terakhir
SELECT status, message, execution_time 
FROM public.backup_logs 
ORDER BY execution_time DESC 
LIMIT 10;
```

**Hasil yang diharapkan:**
- `cron_job_id` di `backup_settings` **bukan NULL**
- Ada satu job dengan nama `daily-auto-backup` di `cron.job`
- Log terakhir menunjukkan `status: 'success'` (bukan 'failed')

---

## Troubleshooting Lanjutan

### Cron Job Masih Tidak Berjalan?

1. **Verifikasi waktu UTC:**
   - Jika Anda set backup jam 02:00 WIB (Asia/Jakarta), sistem akan mengkonversi ke UTC-7 = 19:00 hari sebelumnya
   - Gunakan query ini untuk melihat jadwal berikutnya:
   ```sql
   SELECT cron.next_run_after(
     (SELECT cron_job_id FROM public.backup_settings LIMIT 1),
     now()
   );
   ```

2. **Test manual backup:**
   ```sql
   -- Panggil edge function secara manual
   SELECT net.http_post(
     url := 'https://xyz.supabase.co/functions/v1/admin-backup',
     headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb,
     body := '{"action":"backup","isAuto":true}'::jsonb
   );
   ```

3. **Cek log error di Supabase:**
   - Buka **Functions** → **admin-backup** → **Logs**
   - Lihat apakah ada error saat function dipanggil

---

## Migrasi dari Versi Lama

Jika Anda sudah menggunakan versi lama (14-dynamic-backup-scheduler.sql), ikuti langkah ini:

1. **Backup data lama:**
   ```sql
   SELECT * FROM public.backup_logs;
   SELECT * FROM public.backup_settings;
   ```

2. **Jalankan SQL FIXED:**
   - Jalankan file `14-dynamic-backup-scheduler-FIXED.sql` di SQL Editor

3. **Inisialisasi dengan secrets:**
   ```sql
   SELECT public.initialize_backup_with_secrets(
     'https://xyz.supabase.co',
     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   );
   ```

4. **Verifikasi ulang:**
   ```sql
   SELECT * FROM public.backup_settings;
   SELECT * FROM public.backup_logs ORDER BY execution_time DESC LIMIT 5;
   ```

---

## Pertanyaan Umum (FAQ)

**Q: Apakah secrets saya aman jika disimpan di tabel database?**
A: Relatif aman karena:
- Tabel `backup_settings` memiliki RLS enabled
- Hanya service role yang bisa mengakses
- Untuk keamanan maksimal, gunakan Vault jika tersedia

**Q: Berapa lama backup biasanya selesai?**
A: Tergantung ukuran database. Untuk database kecil (< 100MB), biasanya 1-5 menit.

**Q: Apakah backup berjalan di background tanpa mengganggu aplikasi?**
A: Ya, backup menggunakan edge function yang berjalan terpisah dari aplikasi utama.

**Q: Bagaimana jika saya ingin mengubah jadwal backup?**
A: Gunakan endpoint atau update langsung di database:
```sql
SELECT public.update_backup_settings(
  true,           -- is_enabled
  '15:30:00',     -- backup_time (jam 3 sore)
  'Asia/Jakarta'  -- timezone
);
```

---

## Kontribusi & Feedback

Jika Anda menemukan masalah lain atau punya saran perbaikan, silakan buat issue di repository GitHub.
