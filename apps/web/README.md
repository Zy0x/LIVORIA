# LIVORIA Next.js App

`apps/web` adalah target produksi Next.js App Router untuk LIVORIA. Route utama sudah berjalan native Next; jalur produksi memakai Next penuh dan tidak lagi bergantung pada arsip Vite lama.

## Menjalankan

```bash
corepack pnpm install
corepack pnpm dev
```

Build:

```bash
corepack pnpm build
```

Build ini menjalankan `corepack pnpm --filter @livoria/web build`.

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

- Netlify production build diarahkan ke `apps/web/.next` dan menjalankan build Next langsung.
- Cloudflare memakai Worker proxy ke origin Netlify agar route dinamis Next tidak dipaksa menjadi static asset.
- Legacy Vite sudah tidak menjadi bagian workspace/build produksi. Baseline visual yang masih dipakai berada di source aktif `apps/web/src`.

## PWA / Service Worker

- Source of truth PWA runtime adalah custom service worker di `public/sw.js`.
- Registrasi aktif berada di `app/layout.tsx` dan selalu memakai `/sw.js` dengan `updateViaCache: 'none'`.
- VitePWA/Workbox tidak aktif di app Next produksi. Jangan mengaktifkannya bersamaan dengan custom `/sw.js` tanpa mengganti strategi registrasi.
- Supabase, auth, storage, realtime, API route, Edge/Function route, dan request dengan header sensitif selalu bypass cache.
- Request Next RSC/Flight (`?_rsc`, `text/x-component`, `/_next/data`) juga bypass cache agar data dinamis tidak stale.
- Health check koneksi memakai `/__pwa_ping` yang sengaja bypass service worker cache, jadi indikator online tidak tertipu app shell cache.
- Navigasi memakai network-first dengan fallback ke app shell cache agar PWA tidak blank saat offline.
- Interval cek update service worker saat app terbuka adalah 60 detik, plus cek saat tab visible/focus/online/pageshow.
- Settings PWA bisa membaca status cache, cek update manual, dan membersihkan hanya cache LIVORIA.
- Install prompt tetap dikelola oleh `PWAManager` dan `usePWA`.

## Validasi

```bash
corepack pnpm check
corepack pnpm audit:route-parity
corepack pnpm audit:migration-gate --strict
```
