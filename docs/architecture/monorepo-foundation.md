# Monorepo Foundation

Phase 16 menyiapkan fondasi workspace. Pada Phase 17, aplikasi Vite dipindah ke `apps/web` sebagai package `@livoria/web`.

## Package Awal

- `@livoria/core`: target jangka panjang untuk pure domain logic.
- `@livoria/data`: target jangka panjang untuk kontrak data, mapper, dan repository abstraction yang bebas UI.
- `@livoria/ui-tokens`: tempat token desain dasar yang bisa dipakai lintas aplikasi/package.

## Belum Dipindahkan

`src/shared/domain` belum dipindahkan ke `packages/core` pada phase ini karena masih menjadi compatibility layer untuk:

- `src/lib/titleGrouping.ts`
- `src/lib/supabase-service.ts`
- `src/features/anime/domain/title-grouping.ts`
- `src/features/donghua/domain/title-grouping.ts`
- `src/features/tagihan/domain/*`
- beberapa test Tagihan/Anime

Memindahkan file fisik sekarang akan memaksa update import path lintas feature dan berisiko membuat circular import atau regression build saat phase refactor lain masih aktif.

## Rencana Migrasi Aman

1. Tambahkan export nyata di `@livoria/core` untuk satu domain kecil, misalnya formatter atau storage path.
2. Ubah `src/shared/*` menjadi compatibility shim yang re-export dari `@livoria/core`.
3. Jalankan `pnpm check:packages`, `pnpm typecheck`, dan `pnpm build`.
4. Baru pindahkan domain yang lebih besar seperti title grouping dan tagihan calculation.
5. Jangan pindahkan logic yang import React, Supabase, DOM, router, toast, atau localStorage.

## Guardrail

- Root `pnpm build` menjalankan `@livoria/web` via pnpm filter.
- Netlify publish diarahkan ke `apps/web/dist`.
- Package scripts hanya berjalan jika dipanggil eksplisit lewat `pnpm build:packages` atau `pnpm check:packages`.
