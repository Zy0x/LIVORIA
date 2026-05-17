# Plan: Integrasi Telegram Bot untuk Notifikasi Tagihan Bulanan

## Tujuan
Mengirim laporan tagihan bulanan secara otomatis melalui Telegram Bot, termasuk detail tagihan yang jatuh tempo, overdue, dan ringkasan keuangan.

## Arsitektur

### 1. Setup Bot Telegram
- Buat bot baru via @BotFather di Telegram
- Simpan `TELEGRAM_BOT_TOKEN` di Supabase Secrets
- User mendaftarkan `chat_id` mereka di halaman Settings

### 2. Tabel Database

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
```

### 3. Edge Functions

#### `telegram-monthly-report`
- Dipanggil oleh pg_cron setiap tanggal 1 pukul 08:00
- Query semua user yang subscribe
- Generate laporan HTML/Markdown per user:
  - Total tagihan aktif
  - Tagihan jatuh tempo bulan ini
  - Tagihan overdue
  - Total cicilan masuk bulan ini
  - Est. keuntungan bulan ini
  - Top 5 piutang terbesar
- Kirim via Telegram Bot API `sendMessage` dengan `parse_mode: HTML`

#### `telegram-due-reminder`
- Dipanggil oleh pg_cron setiap hari pukul 08:00
- Cek tagihan yang akan jatuh tempo dalam X hari
- Kirim reminder ke user yang subscribe

#### `telegram-overdue-alert`
- Dipanggil oleh pg_cron setiap hari pukul 09:00
- Cek tagihan baru yang berstatus overdue
- Kirim alert ke user terkait

### 4. Format Pesan Laporan Bulanan

```
📊 *Laporan Tagihan — Maret 2026*

📋 *Ringkasan:*
├ Total Tagihan: 15
├ Aktif: 10 | Lunas: 3 | Overdue: 2
├ Total Piutang: Rp 45.000.000
└ Est. Keuntungan: Rp 8.500.000

💰 *Jatuh Tempo Bulan Ini (5):*
1. Ahmad — iPhone 15 · Rp 820.000 (tgl 5)
2. Budi — Laptop · Rp 1.200.000 (tgl 10)
...

⚠️ *Overdue (2):*
1. Citra — Genset · Rp 650.000 (telat 5 hari)
2. Deni — Motor · Rp 1.500.000 (telat 12 hari)

📈 *Pemasukan Bulan Ini:* Rp 5.200.000
```

### 5. UI di Settings
- Toggle aktifkan notifikasi Telegram
- Input chat_id (dengan petunjuk cara mendapatkan)
- Tombol "Test Kirim" untuk verifikasi
- Pilihan notifikasi: laporan bulanan, reminder jatuh tempo, alert overdue

### 6. Implementasi Bertahap
1. **Phase 1**: Setup bot, tabel, UI pendaftaran chat_id
2. **Phase 2**: Edge function laporan bulanan + pg_cron
3. **Phase 3**: Reminder harian & overdue alert
4. **Phase 4**: Customisasi format & jadwal pengiriman

### 7. Dependensi
- Supabase Edge Functions
- Telegram Bot API (native HTTP, tidak perlu library)
- pg_cron + pg_net untuk scheduling
- Connector Telegram (opsional, bisa juga direct API)
