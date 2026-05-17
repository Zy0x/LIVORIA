# Plan: Notifikasi Tagihan PWA

## Tujuan
Notifikasi tagihan yang userfriendly dan akurat untuk PWA LIVORIA.

## Fitur Utama

### 1. Notifikasi Lokal (Sudah Ada — Perlu Ditingkatkan)
- **Pengingat Jatuh Tempo**: Notifikasi H-7, H-3, H-1, dan hari-H jatuh tempo
- **Overdue Alert**: Notifikasi harian untuk tagihan yang melewati jatuh tempo
- **Rangkuman Bulanan**: Notifikasi awal bulan berisi total tagihan bulan ini

### 2. Penjadwalan Cerdas
- Gunakan `Periodic Background Sync API` untuk cek tagihan setiap 24 jam
- Fallback: cek saat app dibuka (sudah ada via `scheduleBillReminders`)
- Simpan preferensi waktu notifikasi per user (pagi/siang/malam) di Supabase

### 3. Kategori Notifikasi
| Level | Kondisi | Ikon | Vibrate |
|-------|---------|------|---------|
| 🔴 Kritis | Overdue / Hari ini jatuh tempo | ⚠️ | Panjang 3x |
| 🟡 Peringatan | H-1 s/d H-3 | 🔔 | Sedang 2x |
| 🔵 Info | H-7 / Rangkuman | ℹ️ | Pendek 1x |

### 4. Pengaturan User (PWA Settings)
- Toggle on/off notifikasi per kategori
- Pilih waktu notifikasi (08:00 / 12:00 / 18:00)
- Toggle notifikasi overdue harian
- Toggle rangkuman bulanan
- Simpan di tabel `user_preferences` Supabase

### 5. Implementasi Teknis

#### Service Worker (`sw.js`)
```js
// Listen for periodic sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'livoria-bill-check') {
    event.waitUntil(checkBillsAndNotify());
  }
});

// Listen for push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: data.vibrate,
      data: { url: data.url },
      actions: data.actions,
    })
  );
});
```

#### Supabase Edge Function (Opsional — Push Server)
- Cron job harian via Supabase Edge Function
- Query tagihan mendekati jatuh tempo
- Kirim push notification via Web Push API
- Memerlukan: VAPID keys di Supabase secrets

#### Tabel Database Tambahan
```sql
ALTER TABLE public.user_preferences
  ADD COLUMN notif_enabled BOOLEAN DEFAULT true,
  ADD COLUMN notif_time TEXT DEFAULT '08:00',
  ADD COLUMN notif_overdue BOOLEAN DEFAULT true,
  ADD COLUMN notif_summary BOOLEAN DEFAULT true,
  ADD COLUMN push_subscription JSONB DEFAULT NULL;
```

### 6. Alur Kerja
1. User mengaktifkan notifikasi di PWA Settings
2. Browser meminta izin Notification
3. Jika diizinkan, register periodic sync + push subscription
4. Setiap app dibuka → cek tagihan → kirim notifikasi lokal jika perlu
5. Background: periodic sync cek setiap 24 jam
6. (Opsional) Server-side: Edge Function cron kirim push notification

### 7. Prioritas Implementasi
1. ✅ Notifikasi lokal saat app dibuka (sudah ada)
2. 🔲 Halaman pengaturan notifikasi di PWA Settings
3. 🔲 Periodic Background Sync untuk cek otomatis
4. 🔲 Notifikasi action buttons (Bayar / Lihat Detail)
5. 🔲 Edge Function cron untuk push notification server-side
6. 🔲 Rangkuman bulanan otomatis
