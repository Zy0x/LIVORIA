# Audit Project LIVORIA — Laporan Potensi Bug

Berikut hasil audit menyeluruh terhadap arsitektur, state management, autentikasi, pagination, performa, dan keamanan. Dikelompokkan berdasarkan tingkat keparahan.

---

## 🔴 KRITIS (harus segera diperbaiki)

### 1. Dua Supabase client dengan project berbeda hidup berdampingan
- `src/lib/supabase.ts` → hardcoded ke project **`repgwikkyqlhpxfsecor`** (storageKey `livoria-auth`).
- `src/integrations/supabase/client.ts` → memakai env (`uzriwpvlgrdhkmvtxwca` / Lovable Cloud), storage default.
- Saat ini seluruh app pakai yang pertama, tapi keberadaan client kedua + types yang di-generate dari project Cloud menyebabkan:
  - `types.ts` (Database schema) **tidak sinkron** dengan database asli → typing palsu, autocomplete menyesatkan, kemungkinan runtime error saat field tidak ada.
  - Jika ada developer/fitur baru tak sengaja import dari `@/integrations/supabase/client`, user akan login ke project yang salah → sesi kosong, data hilang dari UI.
- **Rekomendasi:** hapus/ganti client integrations agar mengarah ke project yang sama, atau hapus file lib/supabase.ts dan gunakan satu sumber kebenaran.

### 2. Route `/admin` tidak dilindungi & kredensial admin disimpan plaintext
- Di `App.tsx`: `<Route path="/admin" element={<Admin />} />` di luar `ProtectedRoute`.
- Admin auth disimpan di `sessionStorage` dalam bentuk `{ email, key, ts }` **plaintext**. Setiap XSS = pencurian admin key.
- `handleSubmit` di `Auth.tsx` mem-`invoke('admin-auth')` untuk **setiap percobaan login user biasa**, mengirim password user ke fungsi admin (latency + bocor password ke log edge function).
- **Rekomendasi:** validasi admin via JWT/role di server, jangan simpan key di client; pisahkan endpoint, lakukan admin check hanya saat user explicit "Admin Mode".

### 3. Pagination via path param rentan & memutus history
- URL pola `/anime/page=3`. Route definisi `anime/:pageParam` menerima **string apapun** (`/anime/random`, `/anime/page=-99`, `/anime/page=abc`). Validasi hanya `startsWith('page=')` lalu `parseInt`.
- `setCurrentPage` memakai `navigate(..., { replace: true })` → tombol Back browser tidak berfungsi antar halaman pagination.
- `setCurrentPage(1)` saat filter berubah memanggil `navigate('/anime')`, **menghapus query string `?wpage=...`** → state watchlist ikut hilang walau user di tab Koleksi.
- `useEffect` reset page (`Anime.tsx:1647-1650`) **tidak memasukkan dependency** `showHentaiOnly` → filter dewasa tidak reset paginasi.
- **Rekomendasi:** seragamkan ke `?page=` query string, validasi range, gunakan `push` (bukan `replace`) untuk navigasi user, lengkapi dependency array.

### 4. RLS tabel tidak match dengan aplikasi
- Database aktual memiliki tabel `expenses`, `approval_actions`, `audit_logs` (template expense approval), bukan `anime`, `donghua`, `tagihan`, `waifu`, `obat` yang dipakai aplikasi.
- Artinya semua `useQuery({ queryFn: animeService.getAll })` akan **selalu gagal** di project Cloud — bug ini tidak terlihat hanya karena app pakai project eksternal `repgwikkyqlhpxfsecor`.
- Konsisten dengan poin #1: cleanup wajib.

---

## 🟠 TINGGI

### 5. GSAP entrance animation race condition
- `useEffect` di `Anime.tsx`, `Donghua.tsx`, `Dashboard.tsx` hanya bergantung pada `[isLoading]`.
- Card di-render via `paginated` (slice). Saat user ganti halaman / filter, card baru **tidak ikut animasi** karena effect tidak re-run.
- `gsap.context` + `clearProps:'all'` setelah animasi pertama membuat DOM rapi, tapi bila `isLoading` cepat berubah ke `false` sebelum DOM benar-benar berisi card (Suspense lazy), `querySelectorAll('.anime-card')` mendapat 0 elemen → tidak ada animasi entrance.
- **Rekomendasi:** trigger ulang animasi setelah `paginated` siap, atau pakai `requestAnimationFrame` + observer.

### 6. `useWatchedAutoRemove` polling global
- Hook dipanggil di setiap mount `Anime`/`Donghua` (mungkin lainnya). Polling 30 detik → query Supabase ganda saat dua tab/halaman aktif.
- Tidak ada debounce mount/unmount cepat (navigasi pages cepat) → bisa terjadi double update race; user yang baru mengubah status `watched < 1 jam` lalu pindah halaman bisa kena reset karena `watched_at` tidak ter-update di tempat lain.
- **Rekomendasi:** pindahkan ke layer App-level sekali saja, atau Supabase cron edge function.

### 7. React Query: tanpa `onError`/error boundary global
- `App.tsx` tidak punya `ErrorBoundary`. Mutation gagal hanya toast → kalau lempar error di render (mis. ekspektasi field cover_url null), seluruh app putih.
- `useQuery` Dashboard mengambil **5 dataset penuh** sekaligus tanpa pagination → tabel besar = bandwidth & memori boros.
- `staleTime` 5 menit + `refetchOnWindowFocus: false` → user tidak melihat update dari device lain sampai refresh manual.

### 8. Auth flow
- `signUp` mengirim `emailRedirectTo` ke `/`, tapi tidak ada handler verifikasi spesifik → user berakhir di splash + dashboard tanpa feedback bahwa email sudah terverifikasi.
- Auth screen tidak menutup loading splash saat error Google OAuth (loading tetap `true` saat success karena redirect, tapi pada gagal di-set false — ok). Namun `signInWithGoogle` belum dikonfirmasi enabled di Supabase project → klik akan error "provider is not enabled".
- `useAuth` set `loading=false` di kedua `onAuthStateChange` dan `getSession()` → **dua state update**; jika `onAuthStateChange` fire sebelum getSession resolve, ada flicker `Navigate to /auth` lalu kembali.

### 9. Inconsistent admin key flow + race
- Setelah login admin sukses, hanya `sessionStorage.setItem` + `navigate('/admin')`. Tidak ada `signOut` dari Supabase user → user reguler tetap "logged in" sebagai admin paralel; bila membuka tab baru ke `/` mereka masih user reguler, tapi `/admin` masih bisa diakses.

---

## 🟡 SEDANG

### 10. Bundle size & lazy load
- `BulkImportDialog.tsx` 2.498 baris, `AnimeExtraFields.tsx` 868, `TagihanForm.tsx` 1.285 — di-lazy di Anime tapi **tidak** di Tagihan; `TagihanForm` ikut bundle awal halaman tagihan.
- Banyak komponen UI shadcn diimport penuh; tidak tree-shake otomatis di dev.

### 11. Lokal data:
- `TagihanForm` simpan custom payment methods di `localStorage` → tidak sinkron antar perangkat.
- `useThemePreference` fallback localStorage saat user belum login → tema flicker saat sesi resume.

### 12. Pagination skipping reset di mount
- Pattern `filterMountRef = useRef(true)` rapuh: jika user mengganti filter sebelum mount effect kedua jalan (StrictMode dev), reset terlewat.

### 13. Edge function `admin-auth` tanpa rate limit
- Membandingkan plaintext key, tanpa lockout setelah brute force. Endpoint publik (`verify_jwt` belum dicek di config.toml).

### 14. Aksesibilitas
- Tombol pagination `pagination-page-btn` tanpa `aria-current="page"` untuk halaman aktif.
- Banyak ikon-only button tanpa `aria-label` (lihat sidebar, scroll direction button).

### 15. SEO/HTML
- `index.html` tidak diaudit di sini; pastikan tidak ada `<noscript><img></noscript>` di `<head>` (aturan Lovable).
- Tidak ada `<title>` dinamis per route (cek `Helmet`/`document.title`).

---

## 🟢 RENDAH / KEBERSIHAN KODE

### 16. 79 occurrence tipe `any` di Anime/Donghua, 33 `console.*` masih ada di production.
### 17. `Suspense fallback={null}` di `App.tsx` Routes → layar putih sebentar setiap perpindahan; ganti dengan skeleton.
### 18. `NotFound` di luar `Layout` → user authenticated kehilangan navigasi saat URL salah.
### 19. `usePWA`/`PWAPrompt`/`PWAManager` berjalan paralel — periksa duplikasi listener `beforeinstallprompt` & `appinstalled`.
### 20. `useBackGesture` dipanggil 4x dalam komponen yang sama (Anime) — pastikan tidak konflik dengan registrasi yang sama-sama listen `popstate`.
### 21. `gsap.context` di Auth re-run setiap toggle `isLogin`/`isAdminMode` → memicu animasi lagi setiap input switch (sudah disengaja, tapi cek apakah ada layout shift).
### 22. Komentar besar di Anime.tsx menyebut fitur `is_hentai`, `showHentaiOnly` — pastikan field ini ada di schema; jika tidak, `useQuery` gagal pada filter.

---

## 📋 TINDAKAN PRIORITAS

1. **Bereskan duplikasi Supabase client + sinkronkan schema/types** (#1, #4).
2. **Lindungi `/admin` & hapus kredensial plaintext** (#2, #9, #13).
3. **Perbaiki pagination URL/history & dependency reset** (#3).
4. **Stabilkan GSAP & lazy load animasi** (#5).
5. **Pindahkan auto-remove ke server cron** (#6).
6. **Pasang ErrorBoundary global + page-level skeleton fallback** (#7, #17).
7. **Audit Google OAuth enablement, alur signup, dan tema flicker** (#8, #11).

Setelah Anda memilih item yang ingin dikerjakan lebih dulu, saya bisa lanjutkan dengan rencana implementasi yang terperinci dan eksekusi perbaikannya.
