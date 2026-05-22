# LIVORIA Web Directory Standard

Generated: 2026-05-22

Dokumen ini menjadi acuan struktur web setelah migrasi Next.js agar route, UI, server helpers, dan logic reusable tidak bercampur.

## Prinsip

- `apps/web/app` hanya untuk kontrak route Next.js: `layout.tsx`, `page.tsx`, route segment, metadata, dan CSS global.
- Semua kode non-route harus berada di `apps/web/src`.
- Kode yang bisa dipakai Android tidak boleh bergantung pada React, DOM, router, Supabase client, `window`, `document`, atau storage browser.
- Logic lintas platform dipromosikan bertahap ke `packages/core`.
- Token visual lintas platform dipromosikan ke `packages/ui-tokens`.
- Supabase implementation tetap platform-specific: web memakai helper di `apps/web/src/next/lib` dan feature repository web.

## Struktur Web Aktif

```text
apps/web/
|-- app/                 # Next App Router route contract
|-- public/              # static assets, manifest, sw.js
|-- src/
|   |-- next/            # Next-only client shell, preview shell, server/browser helpers
|   |   |-- features/    # Next preview/server feature shells
|   |   `-- lib/         # Next Supabase/env/theme helpers
|   |-- app/             # React app provider/router compatibility surface
|   |-- components/      # UI components used by the active app
|   |-- features/        # Active product features
|   |-- hooks/           # Web hooks
|   |-- integrations/    # Supabase generated types and browser client
|   |-- lib/             # Web compatibility shims
|   |-- route-pages/     # Active client-router page modules
|   |-- services/        # Web service compatibility layer
|   `-- shared/          # Shared web components, hooks, domain, formatters
```

## Reserved Root Folders

These folders are intentionally not used for source files:

- `apps/web/components`
- `apps/web/features`
- `apps/web/lib`
- `apps/web/src/legacy-pages`

Use `corepack pnpm audit:web-structure` to detect regressions.

## Android Reuse Boundary

Move code toward these buckets:

- `packages/core`: pure contracts, enums, status constants, calculation, validation, pagination math, storage path builders, and formatters.
- `@livoria/core/contracts`: API, pagination, status, and dashboard contracts.
- `@livoria/core/domain`: Obat, Waifu, Media, and Tagihan pure domain helpers.
- `@livoria/core/formatters`: currency and date formatter helpers.
- `@livoria/core/storage`: pure storage path helpers.
- `packages/ui-tokens`: color, spacing, typography, semantic token names.
- `apps/web/src/features`: web UI, hooks, React Query, browser-only repository usage.
- `apps/web/src/next/lib`: Next/Supabase implementation details.
- `apps/mobile-rn` and `apps/mobile-flutter`: platform UI and platform repository implementations that consume core contracts.

## Promotion Checklist

Before moving code to `packages/core`, verify:

- No React import.
- No Next import.
- No Supabase import.
- No browser API: `window`, `document`, `localStorage`, `sessionStorage`, `navigator`.
- No Node runtime API unless it is explicitly a Node-only package.
- Covered by focused tests when the logic affects money, dates, status, pagination, or storage paths.

## Current Follow-up

- Split `packages/core/src/index.ts` into `contracts`, `domain`, `formatters`, and `storage`.
- Promote `apps/web/src/shared/domain/storage`, `apps/web/src/shared/formatters`, and selected tagihan/media pure logic to `packages/core`.
- Keep `apps/web/src/lib/*` compatibility shims until active feature imports are migrated.
- Continue splitting high-risk UI files listed by `corepack pnpm audit:next`.
