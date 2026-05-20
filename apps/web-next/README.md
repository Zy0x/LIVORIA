# LIVORIA Next.js App

`apps/web-next` adalah target produksi Next.js App Router untuk LIVORIA. Selama native route Next belum 100% parity, build production memakai legacy parity bridge: Vite dibuild sebagai static bundle di `/legacy/`, lalu Next me-rewrite route utama ke bundle tersebut agar behavior web lama tidak hilang.

## Menjalankan

```bash
corepack pnpm install
corepack pnpm dev
```

Build:

```bash
corepack pnpm build
```

Build ini menjalankan:

1. `corepack pnpm --filter @livoria/web exec vite build --base=/legacy/`
2. `node scripts/build/sync-vite-legacy-to-next.mjs`
3. `corepack pnpm --filter @livoria/web-next build`

## Route

- `/`, `/auth`, `/admin`, `/tagihan`, `/anime`, `/donghua`, dan `/settings` - production rewrite ke legacy parity bridge untuk menjaga behavior penuh.
- `/dashboard` - native dashboard summary Next.
- `/obat` - native Next route dengan CRUD, search/filter/sort, pagination yang mengarah ke awal list card, detail dialog, dan JSON import/export.
- `/waifu` - native Next route dengan CRUD, upload gambar bucket `waifu`, source dropdown, tier/source/search filter, dan JSON import/export.
- Native route files tetap ada sebagai migration target dan bisa dikembangkan sampai parity penuh.

## Env

Gunakan public key saja:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, dan `VITE_SUPABASE_ANON_KEY` tersedia sebagai fallback migrasi. Jangan memakai service role key di public env.

## Deployment

- Netlify production build diarahkan ke `apps/web-next/.next` dan menjalankan legacy parity sync sebelum `next build`.
- Cloudflare memakai Worker proxy ke origin Netlify agar route dinamis Next tidak dipaksa menjadi static asset.
- `apps/web` tetap dapat dijalankan melalui script `vite:*` untuk rollback dan comparison test.

## Native Migration Rule

Jangan menghapus rewrite legacy untuk sebuah route sampai route native Next sudah lolos smoke test fitur penuh, termasuk dialog, import/export, pagination, upload, report, dan mobile layout. Setelah route parity, hapus satu rewrite saja, jalankan `corepack pnpm check`, lalu deploy lewat commit.

Untuk smoke test route native sebelum rewrite dihapus:

```bash
LIVORIA_NEXT_NATIVE_ROUTES=/waifu corepack pnpm --filter @livoria/web-next build
```

Gunakan `LIVORIA_NEXT_NATIVE_ROUTES=*` hanya setelah `corepack pnpm audit:migration-full` lulus.
