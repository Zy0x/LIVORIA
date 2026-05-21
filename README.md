# LIVORIA

LIVORIA adalah personal archive app untuk tagihan, anime, donghua, waifu, dan obat. Web production saat ini berjalan lewat Next.js di `apps/web` dengan source aktif sebagai baseline visual.

## Struktur Utama

- `apps/web` - aplikasi web utama berbasis Next.js.
- `apps/mobile-rn` - prototype React Native/Expo.
- `apps/mobile-flutter` - prototype contract Flutter.
- `packages/core` - logic/type/formatter lintas platform yang aman dipakai ulang.
- `packages/ui-tokens` - token warna dan spacing lintas platform.
- `supabase/functions` - Edge Functions untuk backup/admin dan Telegram Tagihan.
- `docs` - dokumentasi arsitektur, deployment, audit, SQL, dan rencana kerja.

## Command Validasi

Gunakan Corepack karena pnpm tidak selalu tersedia langsung di PATH.

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm check
corepack pnpm audit:project
```

## Deployment

Netlify memakai `netlify.toml` dengan build command `pnpm --filter @livoria/web typecheck && pnpm --filter @livoria/web build` dan publish directory `apps/web/.next`.

Cloudflare memakai Worker `cloudflare/netlify-proxy-worker.ts` sebagai proxy ke Netlify origin. Rule cache manual ada di `docs/deployment/cloudflare-cache-rules.md`.

Push ke GitHub tetap menjadi sumber trigger otomatis. Netlify rebuild dari repo production. Cloudflare Worker deploy otomatis lewat `.github/workflows/deploy-cloudflare.yml` jika secret Cloudflare sudah tersedia. Jangan commit `.env`, output build, atau artifact lokal.
