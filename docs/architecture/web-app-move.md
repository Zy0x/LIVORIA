# Web App Move to `apps/web`

Phase 17 memindahkan Vite app LIVORIA ke package workspace `@livoria/web`.

## File dan Folder yang Dipindahkan

Dari root repo ke `apps/web/`:

- `src/`
- `public/`
- `index.html`
- `vite.config.ts`
- `vitest.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `components.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `manifest.json`

File root yang tetap di root:

- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `netlify.toml`
- `wrangler.jsonc`
- `eslint.config.js`
- `docs/`
- `packages/`
- `supabase/`
- `.github/`

## Command Baru

Root scripts tetap menjadi entrypoint:

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm typecheck
corepack pnpm check
```

Command web package langsung:

```bash
corepack pnpm --filter @livoria/web typecheck
corepack pnpm --filter @livoria/web build
```

## Deployment Config

Netlify tetap menjalankan command root:

```toml
[build]
  command = "corepack pnpm check"
  publish = "apps/web/dist"
```

Cloudflare Wrangler local asset directory juga diarahkan ke:

```json
"directory": "./apps/web/dist"
```

## Rollback Plan

Jika perlu revert manual tanpa Git:

1. Pindahkan kembali isi `apps/web/` berikut ke root:
   - `src/`
   - `public/`
   - `index.html`
   - `vite.config.ts`
   - `vitest.config.ts`
   - `tailwind.config.ts`
   - `postcss.config.js`
   - `components.json`
   - `tsconfig.json`
   - `tsconfig.app.json`
   - `tsconfig.node.json`
   - `manifest.json`
2. Hapus `apps/web/package.json`.
3. Ubah `pnpm-workspace.yaml` agar hanya memuat `packages/*` jika `apps/*` tidak dipakai.
4. Kembalikan root scripts ke command Vite langsung.
5. Kembalikan `netlify.toml` publish ke `dist`.
6. Kembalikan `wrangler.jsonc` asset directory ke `./dist`.
7. Jalankan:

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm build
```

## Catatan Risiko

- Dependency masih berada di root `package.json` agar perpindahan fase ini minim churn. Package `@livoria/web` berisi scripts dan memakai resolver workspace/root.
- Root `dist/` lama bisa masih ada secara lokal dari build sebelum migration, tetapi deployment diarahkan ke `apps/web/dist`.
- `vite.config.ts` di `apps/web` memakai `envDir` ke root repo agar `.env` lokal tetap terbaca tanpa memindahkan secret.
