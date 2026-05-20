# LIVORIA Full Next.js Migration Final

Generated: 2026-05-21

## Status

LIVORIA Web production now uses the Next.js App Router app at `apps/web`.
The former Vite app is archived under `archive/legacy-vite-web` and is no longer part of the pnpm workspace, root production scripts, Netlify build command, or Cloudflare proxy flow.

## Production Entry Points

- Root package: `@livoria/web`
- App directory: `apps/web`
- Netlify build: `pnpm --filter @livoria/web build`
- Netlify publish: `apps/web/.next`
- Netlify package directory: `apps/web`
- Netlify Next adapter: explicit `@netlify/plugin-nextjs`
- Cloudflare: Worker proxy to the Netlify origin

## Native Routes

All guarded migration routes are native Next routes:

- `/`
- `/auth`
- `/admin`
- `/settings`
- `/anime`
- `/anime/[pageParam]`
- `/donghua`
- `/donghua/[pageParam]`
- `/tagihan`
- `/obat`
- `/obat/[pageParam]`
- `/waifu`
- `/waifu/[pageParam]`

## Validation Gates

Run these before any future full-platform change:

```bash
corepack pnpm check
corepack pnpm audit:migration-gate --strict
corepack pnpm audit:route-parity
```

The strict migration gate must keep:

- `productionStillVite: false`
- `productionNextEnabled: true`
- `legacyParityBridgeActive: false`
- `fullNativeProduction: true`
- `fullNativeNextReady: true`
- `totalNextMigrationReady: true`

## Archive Rule

Do not import from `archive/legacy-vite-web` in production code. It exists only as a rollback/reference snapshot.
