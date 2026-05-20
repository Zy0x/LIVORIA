# LIVORIA Next.js Hybrid Preview

`apps/web-next` adalah preview Next.js App Router untuk eksplorasi migrasi bertahap. App ini bukan pengganti production Vite app.

## Menjalankan

```bash
corepack pnpm install
corepack pnpm next:dev
```

Build preview:

```bash
corepack pnpm next:build
```

## Route

- `/` - dashboard preview shell.
- `/dashboard` - dashboard preview shell.
- `/login` - auth/login shell.
- `/tagihan` - read-only financial preview.
- `/anime` - read-only media preview.
- `/donghua` - read-only media preview.
- `/obat` - CRUD preview dengan Server Actions.
- `/waifu` - CRUD preview dengan source options dan upload image server-side.
- `/settings` - shell pengaturan untuk memecah profile, PWA, backup, dan Telegram.

## Env

Gunakan public key saja:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` tersedia sebagai fallback lama. Jangan memakai service role key di Next public env.

## Batasan

- Belum ada auth flow penuh.
- Anime dan Donghua baru read-only; mutation, watchlist, detail, import/export, dan bulk import masih di Vite.
- Tagihan baru read-only; quick pay, history, struk, laporan, kalkulator, dan export masih di Vite.
- Settings belum memindahkan backup/restore/Telegram mutation penuh.
- Deployment production tetap memakai `apps/web` sampai ada keputusan migrasi.
