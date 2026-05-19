# Next.js Gradual Enterprise Migration

Dokumen ini mendefinisikan migrasi Next.js bertahap untuk LIVORIA tanpa mengganti Vite production secara mendadak.

## Target Akhir

- Next.js App Router untuk route yang butuh SSR, auth boundary lebih kuat, dan data loading terstruktur.
- Vite tetap production sampai route Next mencapai parity.
- Shared business contract tetap di `packages/core`.
- Supabase client dibuat per boundary: browser, server, edge/action.

## Non-Goal

- Tidak memindahkan semua route sekaligus.
- Tidak mengubah Netlify production target tanpa approval.
- Tidak memindahkan Tagihan/Anime/Donghua sebelum logic dan repository siap.

## Route Candidates

| Route | Status | Risiko | Rekomendasi |
| --- | --- | --- | --- |
| `/login` | Shell ada di Next | Medium | Lanjut setelah middleware session refresh siap. |
| `/dashboard` | Shell ada di Next | Medium | Migrasi read-only summary dulu. |
| `/settings` | Belum | Medium | Pecah backup/telegram sebelum pindah. |
| `/obat` | Belum | Low | Kandidat pertama untuk CRUD kecil. |
| `/waifu` | Belum | Medium | Tunggu storage/upload boundary. |
| `/tagihan` | Belum | High | Tunda sampai payment logic masuk shared core/tested. |
| `/anime` | Belum | High | Tunda karena import/export, AI title, pagination, watchlist. |
| `/donghua` | Belum | High | Tunda sampai Anime pattern stabil di Next. |

## Enterprise Boundary

Next route harus memakai pola:

```text
app route
  -> feature shell
  -> repository/query action
  -> Supabase server/browser client
```

Larangan:

- Page component import service role.
- UI component memanggil `supabase.from(...)` langsung.
- Server-only code di file client.
- Copy user-facing menyebut detail backend kecuali halaman Admin.

## Migration Checklist Per Route

1. Tulis route shell minimal.
2. Buat repository atau server action terpisah.
3. Tambahkan loading/error/empty state.
4. Pastikan route bisa build statically atau dynamic dengan alasan jelas.
5. Jalankan `corepack pnpm next:typecheck`.
6. Jalankan `corepack pnpm next:build`.
7. Jalankan `corepack pnpm check` untuk memastikan Vite tidak rusak.
8. Dokumentasikan gap sebelum production switch.

## Deployment Strategy

Sampai migration gate terpenuhi:

- Netlify production tetap `apps/web/dist`.
- Next preview dijalankan lokal atau preview site terpisah.
- Jangan mengubah `netlify.toml` production publish/build untuk Next.

Jika Next preview perlu deploy:

- Buat Netlify site terpisah.
- Build command: `corepack pnpm --filter @livoria/web-next build`.
- Publish/runtime mengikuti adapter Next yang dipilih di phase deployment khusus.
