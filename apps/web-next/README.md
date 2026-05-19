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

## Env

Gunakan public key saja:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` tersedia sebagai fallback lama. Jangan memakai service role key di Next public env.

## Batasan

- Belum ada auth flow penuh.
- Belum ada middleware session refresh.
- Belum ada data dashboard nyata.
- Belum ada migrasi route Anime/Donghua/Waifu/Obat/Tagihan.
- Deployment production tetap memakai `apps/web` sampai ada keputusan migrasi.
