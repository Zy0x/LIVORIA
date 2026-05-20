# LIVORIA Next.js App

`apps/web-next` adalah target produksi Next.js App Router untuk LIVORIA. Route utama sudah berjalan native Next; Vite lama tetap tersedia melalui script `vite:*` untuk rollback dan comparison test, tetapi tidak lagi menjadi bridge produksi.

## Menjalankan

```bash
corepack pnpm install
corepack pnpm dev
```

Build:

```bash
corepack pnpm build
```

Build ini menjalankan `corepack pnpm --filter @livoria/web-next build`.

## Route Native

- `/` dan `/dashboard` - dashboard summary dengan recent tagihan/media dan entry quick pay.
- `/auth` - email/password login, signup, Google OAuth, password toggle, dan admin auth shell.
- `/admin` - panel admin native yang tetap melewati Edge Function `admin-auth` dan `admin-backup`.
- `/settings` - profile/theme/logout, backup export/import, Telegram settings, dan PWA status.
- `/anime` dan `/donghua` - CRUD media, favorite/bookmark, watch status, episode progress, filter/sort/search, pagination anchor, detail dialog, watchlist, import/export JSON, dan title language switch.
- `/tagihan` - CRUD, quick pay/lunasi, history, struk upload/delete, laporan, kalkulator, export, filter/sort/search, dan pagination anchor.
- `/obat` - CRUD, search/filter/sort, pagination, detail dialog, dan JSON import/export.
- `/waifu` - CRUD, upload gambar bucket `waifu`, source dropdown, tier/source/search filter, dan JSON import/export.

## Env

Gunakan public key saja:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, dan `VITE_SUPABASE_ANON_KEY` tersedia sebagai fallback migrasi. Jangan memakai service role key di public env.

## Deployment

- Netlify production build diarahkan ke `apps/web-next/.next` dan menjalankan build Next langsung.
- Cloudflare memakai Worker proxy ke origin Netlify agar route dinamis Next tidak dipaksa menjadi static asset.
- `apps/web` tetap dapat dijalankan melalui script `vite:*` untuk rollback dan comparison test.

## Validasi

```bash
corepack pnpm check
corepack pnpm audit:route-parity
corepack pnpm audit:migration-gate --strict
```
