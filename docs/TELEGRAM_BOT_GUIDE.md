# 📱 Panduan Lengkap Telegram Bot LIVORIA

> Dokumentasi lengkap untuk setup, konfigurasi, dan penggunaan bot Telegram yang terintegrasi dengan sistem tagihan LIVORIA.

---

## 📋 Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Prasyarat](#2-prasyarat)
3. [Setup Bot Telegram](#3-setup-bot-telegram)
4. [Konfigurasi Server (Supabase)](#4-konfigurasi-server-supabase)
5. [Menghubungkan Bot di Aplikasi Web](#5-menghubungkan-bot-di-aplikasi-web)
6. [Daftar Perintah Bot](#6-daftar-perintah-bot)
7. [Notifikasi Otomatis](#7-notifikasi-otomatis)
8. [Preferensi Notifikasi](#8-preferensi-notifikasi)
9. [Format Pesan & Contoh](#9-format-pesan--contoh)
10. [Cron Jobs (Jadwal Otomatis)](#10-cron-jobs-jadwal-otomatis)
11. [Troubleshooting](#11-troubleshooting)
12. [FAQ](#12-faq)

---

## 1. Pendahuluan

Bot Telegram LIVORIA memungkinkan Anda menerima notifikasi dan laporan tagihan langsung di Telegram. Fitur utama:

| Fitur | Deskripsi |
|-------|-----------|
| 📊 Laporan Bulanan | Ringkasan lengkap tagihan setiap tanggal 1 |
| ⏰ Reminder Jatuh Tempo | Pengingat otomatis sebelum tagihan jatuh tempo |
| ⚠️ Alert Overdue | Notifikasi saat tagihan melewati jatuh tempo |
| 🤖 Perintah Bot | Cek laporan, overdue, dan status kapan saja via chat |

---

## 2. Prasyarat

Sebelum memulai, pastikan Anda memiliki:

- ✅ Akun Telegram
- ✅ Akun LIVORIA yang sudah terdaftar dan login
- ✅ Akses ke **Supabase Dashboard** (untuk admin/developer)
- ✅ Edge Function `telegram-tagihan` sudah di-deploy ke Supabase

---

## 3. Setup Bot Telegram

### 3.1 Membuat Bot Baru

1. Buka Telegram dan cari **@BotFather**
2. Kirim perintah `/newbot`
3. Ikuti instruksi:
   - Masukkan **nama bot** (contoh: `LIVORIA Tagihan Bot`)
   - Masukkan **username bot** (contoh: `livoria_tagihan_bot`) — harus diakhiri dengan `bot`
4. BotFather akan memberikan **token bot** seperti:
   ```
   7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. **Simpan token ini** — akan digunakan di langkah selanjutnya

### 3.2 Mengatur Deskripsi Bot (Opsional)

Kirim perintah berikut ke @BotFather untuk mengatur info bot:

```
/setdescription
```
> Contoh: `Bot notifikasi tagihan LIVORIA. Terima laporan bulanan, reminder jatuh tempo, dan alert overdue langsung di Telegram.`

```
/setabouttext
```
> Contoh: `LIVORIA Tagihan Bot — Kelola notifikasi tagihan Anda.`

### 3.3 Mengatur Daftar Perintah di BotFather

Kirim ke @BotFather:

```
/setcommands
```

Lalu pilih bot Anda dan kirim daftar perintah berikut:

```
start - Registrasi dan info Chat ID
laporan - Laporan tagihan bulan ini
jatuh_tempo - Tagihan yang akan jatuh tempo
overdue - Tagihan yang sudah melewati jatuh tempo
status - Cek status koneksi akun
help - Tampilkan bantuan dan daftar perintah
```

Setelah ini, pengguna akan melihat menu perintah saat mengetik `/` di chat bot.

---

## 4. Konfigurasi Server (Supabase)

### 4.1 Menyimpan Bot Token

Simpan token bot sebagai secret di Supabase:

1. Buka **Supabase Dashboard** → Project Anda
2. Pergi ke **Settings** → **Edge Functions** → **Secrets**
3. Tambahkan secret baru:
   - **Name**: `TELEGRAM_BOT_TOKEN`
   - **Value**: Token bot dari BotFather (contoh: `7123456789:AAHxxx...`)
4. Klik **Save**

### 4.2 Membuat Tabel Database

Jalankan SQL berikut di **SQL Editor** Supabase:

```sql
CREATE TABLE public.telegram_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notify_monthly_report BOOLEAN DEFAULT true,
  notify_overdue BOOLEAN DEFAULT true,
  notify_due_reminder BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: User hanya bisa melihat subscription miliknya sendiri
CREATE POLICY "Users can view own telegram subscription"
ON public.telegram_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

### 4.3 Deploy Edge Function

Deploy edge function `telegram-tagihan` ke Supabase:

```bash
supabase functions deploy telegram-tagihan --project-ref <PROJECT_REF>
```

### 4.4 Setup Webhook Telegram

Set webhook agar Telegram mengirim pesan ke edge function Anda:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<PROJECT_REF>.supabase.co/functions/v1/telegram-tagihan"}'
```

Ganti:
- `<BOT_TOKEN>` dengan token bot Anda
- `<PROJECT_REF>` dengan project reference Supabase Anda

**Verifikasi webhook:**
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

Respons yang benar akan menunjukkan `"url"` yang sesuai dan `"pending_update_count"` biasanya `0`.

---

## 5. Menghubungkan Bot di Aplikasi Web

### 5.1 Mendapatkan Chat ID

Ada 2 cara mendapatkan Chat ID Telegram Anda:

**Cara 1 — Via @userinfobot:**
1. Buka Telegram, cari **@userinfobot**
2. Kirim `/start`
3. Bot akan membalas dengan informasi akun Anda, termasuk **Id** (angka seperti `123456789`)
4. Salin angka tersebut

**Cara 2 — Via Bot LIVORIA langsung:**
1. Cari bot LIVORIA Anda di Telegram (username yang dibuat di langkah 3.1)
2. Kirim `/start`
3. Bot akan membalas dengan Chat ID Anda dalam format: `Chat ID Anda: 123456789`
4. Salin angka tersebut

### 5.2 Menghubungkan di Web

1. Login ke aplikasi LIVORIA
2. Buka halaman **Pengaturan** (ikon gear di sidebar atau navigasi)
3. Scroll ke bagian **Notifikasi Telegram**
4. Masukkan **Chat ID** yang sudah Anda salin
5. (Opsional) Klik tombol **Test** untuk memverifikasi — bot akan mengirim pesan test ke Telegram Anda
6. Klik tombol **Hubungkan**
7. Jika berhasil, status akan berubah menjadi **Aktif** (badge hijau)
8. Bot akan mengirim pesan konfirmasi ke Telegram: `🎉 Berhasil Terhubung!`

### 5.3 Memutuskan Koneksi

1. Buka **Pengaturan** → bagian **Notifikasi Telegram**
2. Klik tombol **Putuskan** (merah)
3. Notifikasi otomatis akan berhenti, tetapi data subscription tetap tersimpan
4. Anda bisa menghubungkan kembali kapan saja

---

## 6. Daftar Perintah Bot

Berikut semua perintah yang tersedia di bot Telegram LIVORIA:

### `/start`

**Fungsi:** Registrasi awal dan menampilkan Chat ID

**Perilaku:**
- Jika **belum terdaftar**: Menampilkan pesan selamat datang, Chat ID, dan petunjuk cara menghubungkan akun via aplikasi web
- Jika **sudah terdaftar**: Menampilkan konfirmasi bahwa akun sudah terhubung beserta Chat ID

**Contoh respons (belum terdaftar):**
```
👋 Selamat Datang di LIVORIA Bot!

Chat ID Anda: 123456789

📋 Cara Menghubungkan:
1. Buka aplikasi LIVORIA
2. Pergi ke Pengaturan
3. Masukkan Chat ID di atas pada bagian Telegram
4. Klik Hubungkan

Setelah terhubung, Anda akan menerima:
📊 Laporan bulanan otomatis
⏰ Reminder jatuh tempo
⚠️ Alert tagihan overdue

Gunakan /help untuk melihat semua perintah.
```

---

### `/help`

**Fungsi:** Menampilkan daftar semua perintah yang tersedia

**Contoh respons:**
```
📖 Daftar Perintah LIVORIA Bot

/start — Registrasi & info Chat ID
/laporan — Laporan tagihan bulan ini
/jatuh_tempo — Tagihan yang akan jatuh tempo
/overdue — Tagihan yang sudah melewati jatuh tempo
/status — Status koneksi Anda
/help — Tampilkan bantuan ini

💡 Pastikan akun Anda sudah terhubung melalui aplikasi LIVORIA.
```

---

### `/laporan`

**Fungsi:** Menampilkan laporan lengkap tagihan bulan ini

**Prasyarat:** Akun harus sudah terhubung (sudah registrasi Chat ID via web)

**Data yang ditampilkan:**
- Total tagihan (semua status)
- Jumlah tagihan aktif, lunas, dan overdue
- Total piutang (sisa hutang keseluruhan)
- Total modal (tidak termasuk dana luar)
- Estimasi keuntungan
- Cicilan masuk per bulan
- Total yang sudah terkumpul
- Top 5 piutang terbesar (diurutkan dari sisa hutang tertinggi)
- Daftar tagihan overdue (jika ada)

**Contoh respons:**
```
📊 Laporan Tagihan — Maret 2026

📋 Ringkasan:
├ Total Tagihan: 15
├ Aktif: 10 | Lunas: 3 | Overdue: 2
├ Total Piutang: Rp 45.000.000
├ Total Modal: Rp 30.000.000
└ Est. Keuntungan: Rp 8.500.000

💰 Cicilan Masuk/Bulan: Rp 5.200.000
📈 Total Terkumpul: Rp 18.000.000

🏆 Top 5 Piutang Terbesar:
1. Ahmad — iPhone 15 · Rp 12.000.000
2. Budi — Laptop Asus · Rp 8.500.000
3. Citra — Motor Honda · Rp 7.200.000
4. Deni — TV Samsung · Rp 5.800.000
5. Eka — AC Daikin · Rp 4.500.000

⚠️ Overdue (2):
1. Fitri — Genset · Rp 650.000
2. Gani — Kulkas · Rp 1.500.000
```

---

### `/jatuh_tempo`

**Fungsi:** Menampilkan tagihan yang akan jatuh tempo dalam waktu dekat

**Prasyarat:** Akun harus sudah terhubung

**Logika:**
- Menggunakan field `tgl_tempo_hari` dari data tagihan
- Default: menampilkan tagihan yang jatuh tempo dalam **3 hari** ke depan
- Periode bisa diubah di pengaturan web (1, 2, 3, 5, atau 7 hari)

**Contoh respons:**
```
⏰ Tagihan Jatuh Tempo (3 hari ke depan)

1. Ahmad
   📦 iPhone 15
   💰 Cicilan: Rp 820.000
   📅 Tanggal: 15

2. Budi
   📦 Laptop Asus
   💰 Cicilan: Rp 1.200.000
   📅 Tanggal: 16
```

**Jika tidak ada tagihan jatuh tempo:**
```
✅ Tidak ada tagihan yang jatuh tempo dalam 3 hari ke depan.
```

---

### `/overdue`

**Fungsi:** Menampilkan tagihan yang sudah melewati jatuh tempo

**Prasyarat:** Akun harus sudah terhubung

**Data yang ditampilkan per tagihan:**
- Nama debitur
- Nama barang
- Sisa hutang
- Cicilan per bulan

**Contoh respons:**
```
⚠️ Tagihan Overdue (2)

1. Citra
   📦 Genset Honda
   💰 Sisa: Rp 650.000
   📅 Cicilan/bln: Rp 150.000

2. Deni
   📦 Motor Beat
   💰 Sisa: Rp 1.500.000
   📅 Cicilan/bln: Rp 350.000
```

**Jika tidak ada tagihan overdue:**
```
✅ Tidak ada tagihan overdue. Semua pembayaran lancar!
```

---

### `/status`

**Fungsi:** Mengecek status koneksi akun Telegram dengan LIVORIA

**Contoh respons (terhubung):**
```
✅ Akun Terhubung

Chat ID: 123456789
Status: Aktif
```

**Contoh respons (belum terhubung):**
```
❌ Akun Belum Terhubung

Gunakan /start untuk melihat cara menghubungkan akun Anda.
```

---

## 7. Notifikasi Otomatis

Bot dapat mengirim notifikasi otomatis menggunakan cron job. Ada 3 jenis notifikasi:

### 7.1 Laporan Bulanan (`monthly_report`)

| Detail | Nilai |
|--------|-------|
| **Jadwal** | Setiap tanggal **1** pukul **08:00 WIB** (01:00 UTC) |
| **Target** | Semua user dengan `notify_monthly_report = true` |
| **Konten** | Sama seperti perintah `/laporan` |

### 7.2 Reminder Jatuh Tempo (`daily_reminder`)

| Detail | Nilai |
|--------|-------|
| **Jadwal** | Setiap hari pukul **08:00 WIB** (01:00 UTC) |
| **Target** | User dengan `notify_due_reminder = true` |
| **Konten** | Sama seperti perintah `/jatuh_tempo` |
| **Filter** | Hanya dikirim jika ada tagihan yang jatuh tempo (tidak mengirim pesan kosong) |
| **Periode** | Menggunakan `reminder_days_before` per user (default: 3 hari) |

### 7.3 Alert Overdue (`overdue_alert`)

| Detail | Nilai |
|--------|-------|
| **Jadwal** | Setiap hari pukul **09:00 WIB** (02:00 UTC) |
| **Target** | User dengan `notify_overdue = true` |
| **Konten** | Sama seperti perintah `/overdue` |
| **Filter** | Hanya dikirim jika ada tagihan overdue |

---

## 8. Preferensi Notifikasi

Preferensi notifikasi diatur melalui halaman **Pengaturan** di aplikasi web:

### Opsi yang Tersedia

| Preferensi | Default | Deskripsi |
|------------|---------|-----------|
| **Laporan Bulanan** | ✅ Aktif | Ringkasan tagihan setiap tanggal 1 |
| **Reminder Jatuh Tempo** | ✅ Aktif | Pengingat sebelum tanggal jatuh tempo |
| **Alert Overdue** | ✅ Aktif | Notifikasi tagihan yang sudah overdue |
| **Ingatkan Sebelum** | 3 hari | Berapa hari sebelum jatuh tempo (1, 2, 3, 5, atau 7 hari) |

### Cara Mengubah Preferensi

1. Buka **Pengaturan** di aplikasi web
2. Scroll ke bagian **Notifikasi Telegram**
3. Toggle on/off notifikasi yang diinginkan
4. Jika **Reminder Jatuh Tempo** aktif, pilih periode hari pengingat
5. Klik **Simpan Preferensi**

> **Catatan:** Perubahan preferensi berlaku pada pengiriman notifikasi otomatis berikutnya. Perintah manual via bot (`/laporan`, `/jatuh_tempo`, `/overdue`) tetap bisa digunakan kapan saja tanpa terpengaruh preferensi.

---

## 9. Format Pesan & Contoh

Semua pesan bot menggunakan format **HTML** (`parse_mode: HTML`). Elemen formatting yang digunakan:

| Format | Penjelasan |
|--------|-----------|
| `<b>teks</b>` | Teks tebal |
| `<i>teks</i>` | Teks miring |
| `<code>teks</code>` | Teks kode (monospace) |
| Emoji (📊⏰⚠️✅💰) | Indikator visual |

### Format Mata Uang

Semua nilai uang ditampilkan dalam format **Rupiah Indonesia**:
- Contoh: `Rp 1.500.000`
- Tanpa desimal
- Menggunakan `Intl.NumberFormat('id-ID')`

---

## 10. Cron Jobs (Jadwal Otomatis)

### Setup Cron Jobs

Jalankan SQL berikut di **SQL Editor** Supabase untuk mengaktifkan notifikasi otomatis:

```sql
-- 1. Laporan Bulanan — Setiap tanggal 1 pukul 08:00 WIB (01:00 UTC)
SELECT cron.schedule('telegram-monthly-report', '0 1 1 * *', $$
  SELECT net.http_post(
    url:='https://<PROJECT_REF>.supabase.co/functions/v1/telegram-tagihan',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body:='{"action":"monthly_report"}'::jsonb
  );
$$);

-- 2. Reminder Harian — Setiap hari pukul 08:00 WIB (01:00 UTC)
SELECT cron.schedule('telegram-daily-reminder', '0 1 * * *', $$
  SELECT net.http_post(
    url:='https://<PROJECT_REF>.supabase.co/functions/v1/telegram-tagihan',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body:='{"action":"daily_reminder"}'::jsonb
  );
$$);

-- 3. Overdue Alert — Setiap hari pukul 09:00 WIB (02:00 UTC)
SELECT cron.schedule('telegram-overdue-alert', '0 2 * * *', $$
  SELECT net.http_post(
    url:='https://<PROJECT_REF>.supabase.co/functions/v1/telegram-tagihan',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body:='{"action":"overdue_alert"}'::jsonb
  );
$$);
```

> **Ganti** `<PROJECT_REF>` dengan project reference Supabase Anda dan `<ANON_KEY>` dengan anon key Anda.

### Mengelola Cron Jobs

```sql
-- Melihat semua cron jobs yang terjadwal
SELECT * FROM cron.job;

-- Menghapus cron job tertentu
SELECT cron.unschedule('telegram-monthly-report');

-- Melihat history eksekusi
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

---

## 11. Troubleshooting

### Bot tidak merespons perintah

| Penyebab | Solusi |
|----------|--------|
| Webhook belum di-set | Jalankan perintah `setWebhook` (lihat bagian 4.4) |
| Edge function belum di-deploy | Deploy ulang: `supabase functions deploy telegram-tagihan` |
| `TELEGRAM_BOT_TOKEN` belum diset | Tambahkan di Supabase Dashboard → Settings → Edge Functions → Secrets |

### Tombol "Test" gagal

| Penyebab | Solusi |
|----------|--------|
| Chat ID salah | Verifikasi Chat ID via @userinfobot atau `/start` di bot |
| Bot belum di-start oleh user | Buka bot di Telegram dan kirim `/start` terlebih dahulu |
| Token bot invalid | Cek ulang token di Supabase Secrets |

### Notifikasi otomatis tidak terkirim

| Penyebab | Solusi |
|----------|--------|
| Cron job belum dibuat | Jalankan SQL cron.schedule (lihat bagian 10) |
| Extension `pg_cron` / `pg_net` belum aktif | Aktifkan di Supabase Dashboard → Database → Extensions |
| Preferensi notifikasi dimatikan | Cek di Pengaturan → Telegram → toggle yang sesuai |
| Tidak ada data tagihan | Bot tidak mengirim pesan jika tidak ada tagihan |

### "Akun Belum Terhubung" padahal sudah

| Penyebab | Solusi |
|----------|--------|
| Subscription `is_active = false` | Hubungkan ulang via Pengaturan di web |
| User menggunakan Chat ID berbeda | Pastikan Chat ID yang dimasukkan sama dengan akun Telegram yang digunakan |

### Cara memeriksa log Edge Function

1. Buka **Supabase Dashboard** → **Edge Functions**
2. Pilih function `telegram-tagihan`
3. Buka tab **Logs**
4. Cari error message yang relevan

---

## 12. FAQ

### Q: Apakah saya bisa menggunakan bot ini di grup Telegram?
**A:** Saat ini bot dirancang untuk chat pribadi (private chat). Penggunaan di grup belum didukung karena Chat ID yang digunakan adalah milik individual.

### Q: Bagaimana jika saya ganti akun Telegram?
**A:** Buka Pengaturan di web → Putuskan koneksi lama → Masukkan Chat ID baru → Hubungkan kembali.

### Q: Apakah pesan bot bisa dilihat orang lain?
**A:** Tidak. Pesan dikirim ke chat pribadi Anda. Data tagihan Anda hanya bisa diakses oleh akun Anda sendiri (dilindungi Row Level Security).

### Q: Berapa biaya penggunaan bot ini?
**A:** Gratis. Bot menggunakan Telegram Bot API yang tidak dikenakan biaya. Biaya hanya terkait dengan hosting Supabase Anda.

### Q: Apakah bisa mengganti jadwal notifikasi?
**A:** Ya, admin dapat mengubah jadwal cron job melalui SQL Editor di Supabase. Modifikasi expression cron sesuai kebutuhan (lihat bagian 10).

### Q: Data apa saja yang dikirim ke Telegram?
**A:** Hanya ringkasan tagihan (nama debitur, nama barang, nominal). Data sensitif seperti password atau detail pribadi lainnya **tidak pernah** dikirim melalui bot.

### Q: Apakah saya masih bisa menggunakan perintah bot jika notifikasi otomatis dimatikan?
**A:** Ya. Perintah manual (`/laporan`, `/jatuh_tempo`, `/overdue`, `/status`) tetap bisa digunakan kapan saja. Preferensi di pengaturan web hanya mengontrol notifikasi otomatis (cron).

---

## Arsitektur Teknis

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Telegram    │────▶│  Supabase Edge   │────▶│  Supabase   │
│  Bot API     │◀────│  Function        │◀────│  Database   │
│  (Webhook)   │     │  telegram-tagihan│     │  (PostgreSQL)│
└─────────────┘     └──────────────────┘     └─────────────┘
       ▲                      ▲
       │                      │
       │              ┌───────┴────────┐
       │              │  Cron Jobs     │
       │              │  (pg_cron +    │
       │              │   pg_net)      │
       │              └────────────────┘
       │
┌──────┴──────┐
│  User App   │
│  (Web UI)   │
│  Settings   │
└─────────────┘
```

### Alur Data

1. **User → Bot:** User mengirim perintah di Telegram → Webhook meneruskan ke Edge Function → Query database → Kirim respons
2. **Cron → Bot:** pg_cron memicu Edge Function → Query semua subscriber → Kirim notifikasi ke masing-masing
3. **Web → Bot:** User mengatur preferensi di web → Edge Function menyimpan ke `telegram_subscriptions` → Test message dikirim

---

*Dokumentasi ini sinkron dengan edge function `telegram-tagihan` dan komponen `TelegramSettings` di aplikasi web LIVORIA.*
