# Panduan Konfigurasi Google Auth & Supabase - LIVORIA

Dokumen ini berisi langkah-langkah detail untuk mengaktifkan fitur Google Auth pada aplikasi LIVORIA yang di-deploy ke Netlify.

## 1. Konfigurasi Google Cloud Console

1.  Buka [Google Cloud Console](https://console.cloud.google.com/).
2.  Buat proyek baru atau pilih proyek yang sudah ada.
3.  Buka menu **APIs & Services > OAuth consent screen**.
    *   Pilih **External**.
    *   Isi data aplikasi (App name: `LIVORIA`, User support email, Developer contact info).
    *   Pada bagian **Authorized domains**, tambahkan `supabase.co` dan `netlify.app`.
4.  Buka menu **APIs & Services > Credentials**.
    *   Klik **Create Credentials > OAuth client ID**.
    *   Pilih Application type: **Web application**.
    *   Name: `LIVORIA Web Client`.
    *   **Authorized JavaScript origins**:
        *   `https://livoria.netlify.app`
        *   `http://localhost:5173` (untuk development)
    *   **Authorized redirect URIs**:
        *   Dapatkan URL ini dari Supabase Dashboard: **Authentication > Providers > Google**. Copy URL yang berakhiran `.../auth/v1/callback`.
5.  Simpan **Client ID** dan **Client Secret** yang muncul.

## 2. Konfigurasi Supabase Dashboard

1.  Buka proyek Anda di [Supabase Dashboard](https://app.supabase.com/).
2.  Pergi ke **Authentication > Providers**.
3.  Cari **Google** dan aktifkan (Enable).
4.  Masukkan **Client ID** dan **Client Secret** yang Anda dapatkan dari Google Cloud Console.
5.  Klik **Save**.
6.  Pastikan di **Authentication > URL Configuration**:
    *   **Site URL**: `https://livoria.netlify.app`
    *   **Redirect URLs**: Tambahkan `https://livoria.netlify.app/**` dan `http://localhost:5173/**`.

## 3. Update Database (SQL)

Pastikan Anda telah menjalankan script SQL berikut di **SQL Editor** Supabase untuk mendukung penyimpanan tema:

```sql
-- Tambahkan kolom theme ke tabel user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';
```

## 4. Environment Variables (Netlify)

Jika Anda menggunakan environment variables untuk Supabase URL dan Key di Netlify, pastikan sudah terpasang:
*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`

---

**Catatan Penting:**
Aplikasi ini sudah dikonfigurasi untuk secara otomatis menyinkronkan akun Google dengan Supabase Auth. Jika pengguna login dengan email yang sama melalui Google, Supabase akan menghubungkannya ke akun yang sudah ada (jika email sudah terverifikasi) untuk mencegah redundansi akun.
