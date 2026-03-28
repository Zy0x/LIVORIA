# LIVORIA 🎞️

**LIVORIA** adalah platform manajemen koleksi pribadi all-in-one yang dirancang untuk membantu Anda mengelola daftar Anime, Donghua, Waifu, Inventaris Obat, hingga Tagihan Keuangan dalam satu dashboard yang modern dan responsif.

## 🚀 Fitur Utama

### 1. Database Anime & Donghua
- **Batch Management**: Hapus banyak judul sekaligus atau hapus semua judul dalam satu grup (Season/Cour).
- **Advanced Filtering**: Urutkan berdasarkan judul, rating, episode, tahun rilis, hingga **Terbaru Ditonton** (berdasarkan tracking penambahan episode).
- **Watchlist Tracking**: Pantau progress menonton Anda dengan tombol cepat tambah/kurang episode.
- **Smart Grouping**: Pengelompokan otomatis berdasarkan judul induk untuk mengelola banyak season dengan rapi.
- **Reverse Order**: Opsi untuk membalikkan urutan pengurutan di semua halaman koleksi.

### 2. Panel Admin (Developer Control)
- **Database Monitoring**: Pantau jumlah record di setiap tabel secara real-time.
- **Manual Backup & Restore**: Ekspor seluruh database ke file JSON atau simpan langsung ke cloud storage.
- **User Management**: Lihat detail akun pengguna, provider autentikasi (Google, Email, dsb), dan hapus akun secara permanen.
- **Maintenance Tools**: Perbaikan sistem backup untuk memastikan semua tabel dan record terangkut dengan benar.

### 3. Modul Lainnya
- **Waifu Collection**: Simpan daftar karakter favorit Anda dengan rating dan gambar.
- **Inventory Obat**: Kelola stok obat-obatan dengan pengingat dan kategori.
- **Manajemen Tagihan**: Catat tagihan rutin, riwayat pembayaran, dan laporan keuangan bulanan.

## 🛠️ Panduan Pengembangan (Dev Guide)

### Persyaratan Sistem
- **Node.js**: Versi 18 atau lebih baru.
- **Supabase**: Akun Supabase untuk database dan autentikasi.
- **Vite**: Sebagai build tool utama.

### Instalasi
1. Clone repositori:
   ```bash
   git clone https://github.com/Zy0x/LIVORIA.git
   cd LIVORIA
   ```
2. Instal dependensi:
   ```bash
   pnpm install
   ```
3. Konfigurasi Environment:
   Buat file `.env` di root folder dan tambahkan:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Jalankan aplikasi:
   ```bash
   pnpm dev
   ```

### Aturan Pengembangan (Best Practices)
- **Komponen UI**: Gunakan komponen dari `@/components/ui` (shadcn/ui) untuk konsistensi.
- **State Management**: Gunakan `React Query` untuk interaksi data asinkron dengan Supabase.
- **Styling**: Gunakan Tailwind CSS dan ikuti skema warna yang sudah ada (Violet untuk Anime, Emerald untuk Donghua).
- **Animasi**: Gunakan `GSAP` untuk transisi halaman dan elemen UI agar terasa lebih premium.

## 📁 Struktur Proyek
- `src/pages/`: Berisi halaman utama aplikasi.
- `src/lib/`: Logika bisnis, layanan Supabase, dan utilitas.
- `src/components/`: Komponen UI yang dapat digunakan kembali.
- `src/hooks/`: Custom hooks untuk logika React.

## 🛡️ Keamanan & Privasi
LIVORIA mendukung multi-provider login. Jika pengguna memiliki email yang sama di provider berbeda (misal: Google dan Email), sistem akan mencoba melakukan link account atau menampilkan keduanya di panel admin untuk verifikasi manual oleh pengembang.

---
Dikembangkan dengan ❤️ oleh **Dev LIVORIA**.
