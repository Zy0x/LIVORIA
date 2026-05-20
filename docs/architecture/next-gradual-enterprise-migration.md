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
| `/login` | Shell ada di Next | Medium | Lanjut setelah form action/login callback siap. |
| `/dashboard` | Summary preview ada di Next | Medium | Lanjutkan parity detail/list yang masih perlu query penuh. |
| `/settings` | Shell ada di Next | Medium | Pecah backup/telegram/PWA/profile menjadi panel dan server action. |
| `/obat` | CRUD preview ada di Next | Low | Siap untuk parity smoke sebelum switch route. |
| `/waifu` | CRUD preview ada di Next | Medium | Upload image dan source dropdown sudah punya boundary server-side; perlu smoke upload live. |
| `/tagihan` | Quick pay preview ada di Next | High | Quick pay dan lunasi semua tersedia; struk, laporan, export, dan kalkulator masih Vite. |
| `/anime` | Mutation preview ada di Next | High | CRUD dasar, favorit, bookmark, watch status, dan progress tersedia; detail/import/export masih Vite. |
| `/donghua` | Mutation preview ada di Next | High | Mengikuti media action bersama; detail/import/export masih Vite. |

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

## Next 16 Request Boundary

Next preview memakai `apps/web-next/proxy.ts` untuk refresh session cookie secara terpusat. File ini hanya menjaga request/session boundary dan tidak dipakai untuk data fetch berat.

Route kecil yang sudah punya boundary Next:

```text
apps/web-next/app/obat/page.tsx
  -> features/obat/ObatPreviewShell.tsx
  -> features/obat/obat.repository.ts

apps/web-next/app/waifu/page.tsx
  -> features/waifu/WaifuPreviewShell.tsx
  -> features/waifu/waifu.repository.ts
  -> features/waifu/waifu.actions.ts

apps/web-next/app/settings/page.tsx
  -> features/settings/SettingsPreviewShell.tsx
  -> features/settings/settings.repository.ts

apps/web-next/app/anime/page.tsx
apps/web-next/app/donghua/page.tsx
  -> features/media/MediaPreviewShell.tsx
  -> features/media/media.repository.ts
  -> features/media/media.actions.ts

apps/web-next/app/tagihan/page.tsx
  -> features/tagihan/TagihanPreviewShell.tsx
  -> features/tagihan/tagihan.repository.ts
  -> features/tagihan/tagihan.actions.ts
```

CRUD penuh Vite tetap menjadi production sampai smoke test parity dan route-level deployment gate selesai.

## Migration Checklist Per Route

1. Tulis route shell minimal.
2. Buat repository atau server action terpisah.
3. Tambahkan loading/error/empty state.
4. Pastikan route bisa build statically atau dynamic dengan alasan jelas.
5. Jalankan `corepack pnpm next:typecheck`.
6. Jalankan `corepack pnpm next:build`.
7. Jalankan `corepack pnpm check` untuk memastikan Vite tidak rusak.
8. Dokumentasikan gap sebelum production switch.
9. Jalankan `corepack pnpm audit:migration-gate`.

## Deployment Strategy

Sampai migration gate terpenuhi:

- Netlify production tetap `apps/web/dist`.
- Next preview dijalankan lokal atau preview site terpisah.
- Jangan mengubah `netlify.toml` production publish/build untuk Next.
- `corepack pnpm audit:migration-gate -- --strict` harus hijau sebelum production switch direncanakan.

Jika Next preview perlu deploy:

- Buat Netlify site terpisah.
- Build command: `corepack pnpm --filter @livoria/web-next build`.
- Publish/runtime mengikuti adapter Next yang dipilih di phase deployment khusus.
