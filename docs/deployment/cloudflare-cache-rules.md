# Cloudflare Cache Rules untuk LIVORIA

Dokumen ini adalah panduan manual. Jangan aktifkan rule yang mencache semua route tanpa bypass untuk HTML, service worker, auth, API, dan Supabase.

## Prinsip

- HTML harus selalu revalidate agar deploy baru tidak tertahan cache lama.
- Service worker harus selalu revalidate agar PWA bisa mendeteksi versi baru.
- Supabase, auth, Edge Function, dan API response tidak boleh dicache.
- Asset hashed di `/assets/*` aman dicache panjang.
- Jangan gunakan rule `Cache Everything` global untuk seluruh domain LIVORIA.

## Rule yang Direkomendasikan

Urutan rule penting. Letakkan bypass/no-cache sebelum cache asset panjang.

### 1. Bypass API dan Auth

Nama rule: `Bypass API and auth`

Kondisi:

```text
http.request.uri.path starts_with "/api/"
or http.request.uri.path starts_with "/functions/"
or http.request.uri.path starts_with "/.netlify/functions/"
or http.request.uri.path starts_with "/.netlify/edge-functions/"
or http.request.uri.path starts_with "/rest/v1/"
or http.request.uri.path starts_with "/auth/v1/"
or http.request.uri.path starts_with "/storage/v1/"
or http.request.uri.path starts_with "/realtime/v1/"
or http.request.uri.query contains "apikey="
```

Aksi:

```text
Cache eligibility: Bypass cache
Browser TTL: Respect origin
Edge TTL: Bypass
```

Catatan: path Supabase biasanya berada di domain `*.supabase.co`, bukan domain LIVORIA. Rule ini tetap diperlukan jika suatu hari API/Supabase diproxy lewat domain aplikasi.

### 2. Revalidate HTML dan SPA Shell

Nama rule: `Revalidate app shell`

Kondisi:

```text
http.request.uri.path eq "/"
or http.request.uri.path eq "/index.html"
or not http.request.uri.path matches "^/(assets|icons)/.*"
```

Aksi:

```text
Cache eligibility: Bypass cache atau Respect origin
Browser TTL: Respect origin
Edge TTL: Respect origin
```

Jika memakai `Cache Everything`, rule ini wajib `Bypass cache`.

### 3. Revalidate Service Worker

Nama rule: `Revalidate PWA worker`

Kondisi:

```text
http.request.uri.path eq "/sw.js"
or http.request.uri.path eq "/pwa-generated-sw.js"
or http.request.uri.path eq "/registerSW.js"
or http.request.uri.path eq "/manifest.json"
```

Aksi:

```text
Cache eligibility: Bypass cache atau Respect origin
Browser TTL: Respect origin
Edge TTL: Respect origin
```

Tujuan: browser harus melihat `Cache-Control: public, max-age=0, must-revalidate` dari Netlify untuk `sw.js`.

### 4. Cache Asset Hashed

Nama rule: `Cache immutable assets`

Kondisi:

```text
http.request.uri.path starts_with "/assets/"
```

Aksi:

```text
Cache eligibility: Eligible for cache
Browser TTL: 1 year
Edge TTL: 1 year
Cache key: default
```

Asset Vite di `/assets/*` memakai hash filename, jadi aman `immutable`.

### 5. Cache Icon PWA

Nama rule: `Cache PWA icons`

Kondisi:

```text
http.request.uri.path starts_with "/icons/"
```

Aksi:

```text
Cache eligibility: Eligible for cache
Browser TTL: 1 year
Edge TTL: 1 month sampai 1 year
```

Jika icon diganti tanpa nama file berubah, purge `/icons/*`.

## Purge Setelah Deploy Bermasalah

Jika user melihat blank screen, chunk error, atau PWA masih versi lama:

1. Purge URL berikut di Cloudflare:

```text
/
/index.html
/sw.js
/pwa-generated-sw.js
/registerSW.js
/manifest.json
```

2. Purge `/assets/*` hanya jika ada indikasi asset lama masih tersaji.
3. Di browser user, buka Pengaturan PWA LIVORIA dan jalankan update bila banner tersedia.
4. Jika masih blank, gunakan tombol clear cache di layar error LIVORIA atau browser DevTools `Application > Clear storage`.
5. Untuk PWA terinstal yang masih macet, tutup semua tab/app LIVORIA lalu buka ulang setelah purge selesai.

## Checklist Manual

- `sw.js` tidak boleh `max-age` panjang di Cloudflare.
- HTML route seperti `/anime`, `/tagihan`, `/settings` tidak boleh dicache sebagai dokumen permanen.
- Request dengan header `Authorization` atau `apikey` tidak boleh masuk cache.
- Supabase Edge Functions tidak boleh diberi rule cache.
- Aktifkan `Development Mode` sementara saat debugging cache produksi.
