# 2026-05-21 Auth and Floating Action Regression Audit

## Scope

Audit lanjutan setelah laporan visual produksi:

- Login Google yang dibatalkan membuat tombol auth tetap `Memproses...`.
- Floating action `+` kehilangan gerakan dock dan tetap terasa menggantung di atas.
- Guard audit proyek perlu menangkap regresi yang sama sebelum deploy berikutnya.

## Findings

### Google OAuth return state

`apps/web/src/legacy-pages/Auth.tsx` memakai satu state `loading` untuk login manual, register, admin, dan Google OAuth. Alur OAuth Supabase dapat meninggalkan halaman sebelum promise dianggap selesai. Jika user kembali dari Google melalui back/cancel/browser restore, halaman bisa kembali dengan `loading=true`, sehingga tombol manual ikut terkunci.

Perbaikan:

- Tambah `oauthInFlightRef` agar reset hanya menyasar login Google.
- Reset loading saat halaman kembali aktif melalui `pageshow`, `focus`, dan `visibilitychange`.
- Tambah timer fallback 15 detik jika OAuth tidak benar-benar berpindah halaman.
- Submit manual dan toggle Masuk/Daftar membersihkan state OAuth yang tertinggal.

### Floating action dock

`apps/web/src/components/ScrollDirectionButton.tsx` sebelumnya memisahkan tombol `+` dan tombol scroll dalam flex stack. Ini mencegah overlap, tetapi membuat tombol `+` selalu menempati slot atas sehingga animasi dock terasa hilang.

Perbaikan:

- Container tetap fixed, tetapi tombol diatur absolut.
- Tombol scroll berada di slot bawah.
- Tombol `+` pindah ke bawah ketika tombol scroll hidden, dan naik hanya ketika tombol scroll aktif.
- Transisi `bottom` menjaga animasi tetap terlihat tanpa menumpuk tombol.

## Regression Guards

`scripts/audit/livoria-project-audit.mjs` sekarang memeriksa:

- `googleOauthReturnReset`: Auth page wajib punya guard `oauthInFlightRef`, `pageshow`, `visibilitychange`, dan `resetOauthLoading`.
- `floatingActionDynamicDock`: Floating action wajib punya dynamic dock dengan `shouldRaiseAddButton` dan transisi bottom.

## Manual Checks

- Buka `/auth`, klik Google Account, lalu kembali ke halaman auth. Tombol manual harus kembali aktif.
- Buka `/anime`, scroll sampai tombol `+` muncul, lalu scroll lagi agar tombol scroll muncul. Tombol `+` harus naik sementara, kemudian turun lagi saat tombol scroll hidden.
