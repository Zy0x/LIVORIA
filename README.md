# LIVORIA

LIVORIA adalah personal archive app untuk mengelola tagihan, anime, donghua, waifu, obat, dashboard ringkasan, admin tooling, dan PWA/offline support. Web production saat ini berjalan lewat Next.js di `apps/web`, dengan struktur feature dan shared package yang disiapkan agar logika penting bisa dipakai ulang ke Android prototype.

## Fitur Utama

- **Tagihan** - CRUD tagihan, quick pay, lunasi semua, history pembayaran, struk, laporan, kalkulator, export, dan filter/sort/search.
- **Anime** - CRUD media, grid/list, favorite, bookmark, watch status, progress episode, watchlist, bulk import/export, title language switch, dan pagination anchor.
- **Donghua** - Pola media seperti Anime dengan label, genre, dan ikon yang tetap spesifik Donghua.
- **Waifu** - CRUD koleksi, upload gambar, tier S/A/B/C, source anime/donghua, filter tier/source/search, dan import/export.
- **Obat** - CRUD obat, detail dialog, search/filter/sort, pagination, dan import/export JSON.
- **Dashboard** - Ringkasan data, statistik tagihan/media, jadwal, quick links, dan quick pay entry.
- **Admin** - Admin auth shell, database stats, backup/restore, daftar user, dan pengaturan backup.
- **PWA** - Install prompt, service worker custom, app shell fallback, cache kontrol, update detection, dan status PWA di Settings.

## Tech Stack

Production web saat ini memakai:

- Next.js App Router
- React
- TypeScript
- Supabase Auth, Database, Storage, dan Edge Functions
- TanStack Query
- Tailwind CSS
- Radix UI / shadcn-style primitives
- GSAP
- Recharts
- Vitest
- pnpm workspace

Catatan migrasi: beberapa dokumen lama menyebut Vite karena LIVORIA berasal dari React/Vite. Vite tidak lagi menjadi build production utama; baseline visual dan behavior yang masih diperlukan sudah dipindahkan ke source aktif `apps/web`. Package `react-router-dom` masih ada untuk compatibility surface yang belum sepenuhnya dibersihkan, bukan sebagai router production utama.

## Struktur Folder

```text
.
|-- apps/
|   |-- web/                 # Web production Next.js
|   |   |-- app/              # Next App Router entry dan route shell
|   |   |-- src/
|   |   |   |-- next/         # Next-only client/server shell dan helper
|   |   |   |-- components/    # Komponen lintas feature dan UI primitives
|   |   |   |-- features/      # Feature modules: tagihan, anime, donghua, waifu, obat, dashboard, admin
|   |   |   |-- hooks/         # Hooks lintas halaman
|   |   |   |-- integrations/  # Supabase client dan generated database types
|   |   |   |-- lib/           # Compatibility shims dan utility lama yang masih dipakai
|   |   |   |-- route-pages/   # Modul halaman aktif untuk client router
|   |   |   |-- services/      # Service compatibility layer
|   |   |   `-- shared/        # Shared domain, formatters, routing, components, constants
|   |   `-- public/           # manifest, icons, sw.js, robots
|   |-- mobile-rn/           # Prototype React Native/Expo
|   `-- mobile-flutter/      # Prototype Flutter contract
|-- packages/
|   |-- core/                # Logic/type/formatter pure lintas platform
|   |-- data/                # Package data contract awal
|   `-- ui-tokens/           # Token warna dan spacing lintas platform
|-- supabase/
|   `-- functions/           # Edge Functions
|-- docs/                   # Arsitektur, audit, deployment, SQL, dan roadmap
|-- cloudflare/             # Worker proxy ke origin Netlify
|-- scripts/audit/          # Audit, debug map, migration gate, route parity
|-- netlify.toml
|-- pnpm-workspace.yaml
`-- package.json
```

## Install

Gunakan Node.js 22 dan Corepack.

```bash
corepack enable
corepack prepare pnpm@10.12.4 --activate
corepack pnpm install
```

Jika `pnpm` tidak tersedia langsung di PATH, tetap gunakan `corepack pnpm`.

## Development

Menjalankan web utama:

```bash
corepack pnpm dev
```

Perintah itu menjalankan `@livoria/web` di `apps/web` lewat `next dev`.

Menjalankan package tertentu:

```bash
corepack pnpm --filter @livoria/web dev
corepack pnpm --filter @livoria/mobile-rn start
```

## Build

Build web production:

```bash
corepack pnpm build
```

Build langsung package web:

```bash
corepack pnpm --filter @livoria/web build
```

Validasi penuh sebelum perubahan besar:

```bash
corepack pnpm check
```

`check` menjalankan typecheck web, build web, migration gate, route parity, dan package checks.

## Preview Production

Setelah build:

```bash
corepack pnpm preview
```

Perintah ini menjalankan `next start` untuk `@livoria/web`. Pastikan environment variable production-like tersedia sebelum preview.

## Environment Variables

Jangan commit `.env` dan jangan menulis key asli di dokumentasi. Gunakan `.env.example` sebagai template.

Frontend/public Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-or-anon-key"
```

Fallback migrasi yang masih didukung oleh client:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
NEXT_PUBLIC_VITE_SUPABASE_URL=""
NEXT_PUBLIC_VITE_SUPABASE_PUBLISHABLE_KEY=""
NEXT_PUBLIC_VITE_SUPABASE_ANON_KEY=""
VITE_SUPABASE_URL=""
VITE_SUPABASE_PUBLISHABLE_KEY=""
VITE_SUPABASE_ANON_KEY=""
```

Server/Edge/local-only secrets:

```env
SUPABASE_SERVICE_ROLE_KEY=""
ADMIN_EMAIL=""
ADMIN_KEY=""
AUTO_BACKUP_SECRET=""
GROQ_API_KEY=""
GEMINI_API_KEY=""
TELEGRAM_BOT_TOKEN=""
NETLIFY_AUTH_TOKEN=""
NETLIFY_PROJECT_ID=""
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_ACCOUNT_ID=""
```

Aturan penting:

- Jangan memakai service role key di browser atau variable `NEXT_PUBLIC_*`.
- Jangan print `.env` di log, issue, screenshot, atau README.
- Untuk Next.js, semua variable `NEXT_PUBLIC_*` akan masuk bundle browser.

## Supabase Setup Notes

- Client utama berada di `apps/web/src/integrations/supabase/client.ts`.
- Generated database types berada di `apps/web/src/integrations/supabase/types.ts`.
- SQL referensi dan patch manual berada di `docs/sql/`.
- Edge Functions berada di `supabase/functions/`.
- Setiap table yang dipakai user harus dilindungi RLS dan policy berbasis user yang sesuai.
- Storage bucket seperti struk dan waifu harus memakai path aman dan policy yang tidak membuka data user lain.
- RPC penting yang sudah didokumentasikan antara lain dashboard summary dan record tagihan payment.

Panduan terkait:

- `docs/sql/README.md`
- `docs/security/phase-1-security-hotfix.md`
- `docs/ADMIN_BACKUP_SETUP.md`
- `docs/TELEGRAM_BOT_GUIDE.md`

## PWA / Service Worker Notes

- Source of truth PWA runtime adalah custom service worker di `apps/web/public/sw.js`.
- Registrasi berada di Next app shell dan memakai `/sw.js` dengan update cache yang tidak agresif.
- Supabase, auth, storage, realtime, API, Edge/Function routes, dan request dengan header sensitif tidak boleh dicache.
- HTML/app shell dan `/sw.js` harus revalidate agar update tidak menyebabkan blank screen atau cache lama.
- Asset hashed Next di `/_next/static/*` aman dicache panjang.
- Cloudflare cache rules manual ada di `docs/deployment/cloudflare-cache-rules.md`.

## Testing

Menjalankan semua test web:

```bash
corepack pnpm test
```

Menjalankan test package web langsung:

```bash
corepack pnpm --filter @livoria/web test
```

Area yang sudah memiliki test penting:

- Tagihan/payment calculation dan cycle logic.
- Import/export normalization.
- Currency/date formatter.
- Pagination routing.
- Form helper tertentu.

## Linting dan Typecheck

Typecheck root:

```bash
corepack pnpm typecheck
```

Lint package web:

```bash
corepack pnpm lint
```

Saat ini `lint` untuk `@livoria/web` menjalankan TypeScript `tsc --noEmit`. Roadmap strict mode penuh ada di `docs/architecture/typescript-safety-roadmap.md`.

## Audit dan Debugging

Command audit yang sering dipakai:

```bash
corepack pnpm audit:project
corepack pnpm audit:risk
corepack pnpm audit:next
corepack pnpm audit:edge
corepack pnpm audit:web-structure
corepack pnpm audit:migration-gate --strict
corepack pnpm audit:route-parity
corepack pnpm debug:map
corepack pnpm debug:map:md
```

Dokumen debugging:

- `docs/architecture/debugging-playbook.md`
- `docs/audits/debuggability-map.md`
- `docs/architecture/full-next-migration-final.md`
- `docs/architecture/next-route-parity.md`

## Deployment

Netlify:

- Config utama: `netlify.toml`.
- Build command: typecheck `@livoria/web`, lalu build Next.
- Publish directory: `apps/web/.next`.
- Plugin Next: `@netlify/plugin-nextjs`.
- Push ke repo production menjadi trigger rebuild otomatis jika Git integration Netlify aktif.

Cloudflare:

- Worker proxy berada di `cloudflare/netlify-proxy-worker.ts`.
- Config Worker berada di `wrangler.jsonc`.
- Cache rules manual didokumentasikan di `docs/deployment/cloudflare-cache-rules.md`.
- Jangan aktifkan `Cache Everything` global tanpa bypass untuk HTML, service worker, API, auth, dan Supabase.

Supabase:

- Deploy Edge Function hanya jika ada perubahan di `supabase/functions` atau konfigurasi terkait.
- SQL di `docs/sql` adalah dokumen/setup manual kecuali dipindah ke migration resmi.

## Roadmap Singkat

- Bersihkan sisa compatibility React Router/Vite surface setelah route Next stabil.
- Lanjutkan pengurangan `any` dan aktifkan strict TypeScript secara bertahap.
- Pindahkan pure domain logic yang aman ke `packages/core`.
- Perkuat contract shared untuk React Native dan Flutter prototype.
- Tambahkan smoke test visual untuk route besar: Dashboard, Tagihan, Anime, Donghua, Waifu, Obat, Settings, Admin.
- Perluas validasi import/export per feature dengan schema-based narrowing.

## Troubleshooting Umum

### Blank screen setelah deploy

1. Pastikan build Netlify berhasil.
2. Clear cache PWA dari Settings atau browser devtools.
3. Pastikan `/sw.js` dan HTML tidak dicache terlalu agresif oleh Cloudflare.
4. Jalankan `corepack pnpm audit:migration-gate --strict`.
5. Cek console browser untuk chunk load error dan Supabase env missing.

### Supabase env missing

Pastikan minimal variable ini tersedia:

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
```

Jika masih memakai env lama, pastikan fallback Vite/NEXT_PUBLIC_VITE tidak kosong.

### Auth Google kembali ke halaman login dan state macet

1. Cek redirect URL di Supabase Auth provider.
2. Pastikan domain production dan localhost masuk allow list.
3. Cek console untuk error OAuth callback.
4. Jangan menyimpan state auth manual baru di localStorage tanpa cleanup.

### PWA tidak update

1. Buka Settings PWA dan cek update manual.
2. Pastikan `/sw.js` mendapat header `Cache-Control: public, max-age=0, must-revalidate`.
3. Pastikan Cloudflare menghormati origin header.
4. Clear cache LIVORIA saja, bukan semua storage browser, jika memungkinkan.

### Import/export gagal

1. Pastikan file tidak melewati batas ukuran/row count.
2. Cek format JSON/CSV masih backward compatible.
3. Cek console untuk error schema validation.
4. Jalankan test import/export normalization.

### Netlify atau Cloudflare tidak auto-build

1. Pastikan commit sudah masuk branch production.
2. Pastikan Git integration Netlify aktif untuk repo/branch yang benar.
3. Pastikan GitHub Action Cloudflare memiliki secret yang dibutuhkan.
4. Cek workflow dan deploy log, jangan menaruh token di source.

## Refactor yang Sudah Dilakukan

- Web production dipindahkan ke `apps/web` sebagai Next.js app.
- Feature besar dipecah bertahap: Obat, Waifu, Anime, Donghua, Tagihan, Dashboard, Admin.
- Supabase client disatukan ke integration client typed.
- Service layer besar dipecah menjadi repository/service modular dengan compatibility exports.
- Domain logic sensitif seperti tagihan/payment dan media sorting/filtering mulai dipisah dari UI.
- Import/export berat memakai dynamic import untuk area tertentu.
- PWA custom service worker dirapikan agar API/auth/Supabase tidak dicache.
- Monorepo foundation dibuat dengan `packages/core`, `packages/data`, dan `packages/ui-tokens`.
- TypeScript safety ditingkatkan bertahap dan roadmap strict mode didokumentasikan.
