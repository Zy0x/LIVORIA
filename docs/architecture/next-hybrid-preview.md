# Next.js Hybrid Preview Strategy

Phase 19 membuat `apps/web-next` sebagai preview berdampingan dengan Vite production app.

## Prinsip

- `apps/web` tetap production source of truth.
- `apps/web-next` hanya untuk validasi App Router, SSR boundary, dan shared package usage.
- Netlify production config tidak diarahkan ke Next dalam phase ini.
- Migrasi route dilakukan feature-by-feature setelah shell, auth, data layer, dan deployment preview stabil.

## Shared Packages

- `@livoria/core` dipakai untuk tipe dan formatter yang pure.
- `@livoria/ui-tokens` dipakai untuk warna dan spacing agar visual baseline konsisten.

## Supabase Boundary

- Browser/server client memakai `@supabase/ssr`.
- Env yang digunakan hanya `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Service role key tidak boleh masuk ke app Next.
- Middleware session refresh belum dipasang agar phase ini tetap preview shell minimal.

## Deployment Preview

Untuk preview manual, jalankan build khusus package:

```bash
corepack pnpm --filter @livoria/web-next build
```

Jika nanti ingin deploy preview terpisah, buat site Netlify baru atau deploy context yang publish/build-nya menunjuk ke `apps/web-next`, bukan mengubah production `netlify.toml` utama sebelum migrasi disetujui.

## Migration Gate

Sebelum memindahkan route production:

1. Auth dan protected route Next harus setara dengan Vite.
2. Supabase SSR/session refresh harus dites login/logout.
3. Dashboard data harus memakai repository/hook yang sama atau compatibility layer yang jelas.
4. Web Vite build tetap hijau selama masa hybrid.
