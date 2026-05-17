# PWA Update Notification Fix — LIVORIA v4.1

## Masalah yang Diperbaiki

### 1. **Notifikasi Pembaruan Lambat/Tidak Muncul di Mobile**
- **Penyebab**: Polling update hanya setiap 60 detik (di `index.html`) dan 30 detik (di `PWAManager.tsx`)
- **Dampak**: Pengguna mobile harus menunggu hingga 1 menit untuk melihat notifikasi update
- **Solusi**: Percepat polling menjadi **10 detik** + tambah aggressive detection

### 2. **Duplikasi Service Worker Registration**
- **Penyebab**: SW didaftarkan 2 kali dengan konfigurasi berbeda:
  - Di `index.html`: `updateViaCache: 'none'` + polling 60s
  - Di `main.tsx`: Tanpa opsi, polling tidak ada
- **Dampak**: Konflik registrasi, keterlambatan deteksi update
- **Solusi**: Hapus duplikasi, gunakan hanya `index.html` untuk registrasi awal

### 3. **Update Terlewat Jika Terjadi Sebelum React Mount**
- **Penyebab**: Event listener `updatefound` di `usePWA.ts` hanya aktif saat hook mount
- **Dampak**: Update yang terjadi saat React loading tidak terdeteksi
- **Solusi**: Cek `reg.waiting` segera saat mount, tidak hanya mendengarkan event

### 4. **Polling Redundan di PWAManager**
- **Penyebab**: PWAManager melakukan polling terpisah setiap 30 detik
- **Dampak**: Duplikasi, memperlambat mobile, pemborosan resource
- **Solusi**: Hapus polling di PWAManager, andalkan polling di `index.html`

---

## Perubahan yang Dilakukan

### File: `index.html`

**Sebelum:**
```javascript
// Cek update setiap 60 detik
setInterval(function() {
  reg.update().catch(function() {});
}, 60 * 1000);
```

**Sesudah:**
```javascript
// Cek update setiap 10 detik untuk deteksi lebih cepat di mobile
setInterval(function() {
  reg.update().catch(function() {});
}, 10 * 1000);

// Cek saat tab aktif kembali
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    console.log('[PWA] Tab visible, checking for updates...');
    reg.update().catch(function() {});
  }
});

// Cek saat kembali online
window.addEventListener('online', function() {
  console.log('[PWA] Back online, checking for updates...');
  reg.update().catch(function() {});
});
```

**Keuntungan:**
- ✅ Polling lebih cepat (10s vs 60s)
- ✅ Update terdeteksi saat tab aktif kembali
- ✅ Update terdeteksi saat koneksi kembali online
- ✅ Registrasi lebih awal (sebelum React load)

---

### File: `src/main.tsx`

**Sebelum:**
```typescript
// Duplikasi registrasi SW
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then((registration) => {
        console.log("[App] Service Worker registered:", registration);
      });
  });
}
```

**Sesudah:**
```typescript
// ✅ Service Worker registration moved to index.html for earlier initialization
// This ensures SW is registered before React bundle loads, preventing race conditions
```

**Keuntungan:**
- ✅ Tidak ada duplikasi registrasi
- ✅ Registrasi lebih awal (di `index.html` saat page load)
- ✅ Menghindari race condition antara React dan SW

---

### File: `src/hooks/usePWA.ts`

**Perubahan Kunci:**

1. **Cek `reg.waiting` segera saat mount:**
```typescript
// CRITICAL: Cek apakah update SUDAH waiting (mungkin terjadi sebelum React mount)
if (reg.waiting) {
  console.log('[PWA] 🔄 Update already waiting! Showing banner immediately...');
  setNeedsUpdate(true);
}
```

2. **Tambah listener dengan cleanup yang proper:**
```typescript
const handleUpdateFound = () => {
  console.log('[PWA] 📦 Update found, installing...');
  const sw = reg.installing;
  if (!sw) return;

  const handleStateChange = () => {
    console.log('[PWA] 🔄 SW state:', sw.state);
    if (sw.state === 'installed' && navigator.serviceWorker.controller) {
      console.log('[PWA] ✅ Update ready! Showing banner now!');
      setNeedsUpdate(true);
    }
  };

  sw.addEventListener('statechange', handleStateChange);
};

reg.addEventListener('updatefound', handleUpdateFound);

// Cleanup listener
return () => {
  reg.removeEventListener('updatefound', handleUpdateFound);
};
```

3. **Tambah message handler dari SW:**
```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'UPDATE_AVAILABLE') {
      console.log('[PWA] 🔔 SW notified: update available!');
      setNeedsUpdate(true);
    }
  };

  navigator.serviceWorker?.addEventListener('message', handleMessage);
  return () => {
    navigator.serviceWorker?.removeEventListener('message', handleMessage);
  };
}, []);
```

**Keuntungan:**
- ✅ Update terdeteksi segera meskipun terjadi sebelum React mount
- ✅ Proper cleanup listener (tidak memory leak)
- ✅ Support message dari SW untuk notifikasi instan

---

### File: `src/components/PWAManager.tsx`

**Perubahan:**
- ✅ Hapus polling redundan (sudah di `index.html`)
- ✅ Fokus hanya pada UI rendering saat `needsUpdate` berubah
- ✅ Tambah spinning icon di update banner untuk feedback visual
- ✅ Maintain z-index `z-[999990]` untuk selalu di atas modal

**Sebelum:**
```typescript
// Polling agresif setiap 30 detik
const interval = setInterval(checkForUpdate, 30_000);
```

**Sesudah:**
```typescript
// Polling sudah ditangani di index.html (setiap 10s + visibility change + online event)
// Jadi di sini kita hanya perlu menampilkan banner saat needsUpdate berubah
```

**Keuntungan:**
- ✅ Tidak ada duplikasi polling
- ✅ Lebih efisien, terutama di mobile
- ✅ Mengurangi beban CPU/battery

---

## Hasil Akhir

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| **Polling Interval** | 60s (index.html) + 30s (PWAManager) | 10s (index.html) |
| **Deteksi saat Tab Aktif** | ❌ Tidak ada | ✅ Ya |
| **Deteksi saat Online** | ❌ Tidak ada | ✅ Ya |
| **Update Terlewat** | ⚠️ Bisa terjadi | ✅ Tidak |
| **Duplikasi Registrasi** | ⚠️ Ada 2x | ✅ Hanya 1x |
| **Duplikasi Polling** | ⚠️ Ada 2x | ✅ Hanya 1x |
| **Response Time Mobile** | ~60 detik | ~10 detik |

---

## Testing Checklist

- [ ] Test di Chrome/Edge desktop — banner muncul dalam 10 detik
- [ ] Test di mobile (Android Chrome) — banner muncul dalam 10 detik
- [ ] Test di iOS Safari — banner muncul (manual install guide)
- [ ] Test saat tab tidak aktif — update terdeteksi saat tab aktif kembali
- [ ] Test offline → online — update terdeteksi saat online kembali
- [ ] Test update dismiss — tidak muncul lagi sampai update baru
- [ ] Cek console logs — harus ada `[PWA]` logs untuk tracking

---

## Deployment Notes

1. **Build & Deploy** aplikasi dengan perubahan ini
2. **Increment version** di `package.json` atau `sw.js` cache name
3. **Monitor** browser console untuk `[PWA]` logs
4. **Gather feedback** dari pengguna tentang kecepatan notifikasi

---

## Referensi

- [MDN: Service Worker Update](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/update)
- [Web.dev: Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [PWA Update Strategies](https://www.npmjs.com/package/workbox-window)
