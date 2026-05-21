# LIVORIA Debugging Playbook

Dokumen ini menjelaskan alur debug yang aman untuk project LIVORIA setelah migrasi penuh ke Next.js.

## Command Utama

Gunakan command dari root repo:

```bash
corepack pnpm debug:map
corepack pnpm debug:map:md
corepack pnpm debug:audit
corepack pnpm check
```

## Kapan Dipakai

- `debug:map`: ketika ingin tahu file mana yang paling sulit didebug, terlalu besar, atau berpotensi melanggar boundary.
- `debug:map:md`: ketika ingin memperbarui artifact Markdown di `docs/audits/debuggability-map.md`.
- `debug:audit`: sebelum refactor besar atau sebelum migrasi route/feature sensitif.
- `check`: sebelum merge/deploy, karena command ini menjalankan typecheck, build, migration gate, route parity, dan package checks.

## Boundary Debug

### Route/Page

Page hanya menjadi orchestrator:

- mengambil hook feature.
- menyusun komponen.
- menyimpan state dialog yang memang route-level.
- tidak memanggil Supabase langsung.

Jika page melewati 450 baris, audit akan menandainya sebagai `page-not-thin`.

### Component

Komponen dipecah berdasarkan tanggung jawab visual:

- header.
- toolbar/filter.
- list/grid.
- card/row.
- dialog shell.
- dialog body/form section.
- action menu.

Jika komponen melewati 450 baris, audit akan menandainya sebagai `component-hard-to-debug`.

### Hook

Hook harus fokus:

- query/server state.
- filter/search/sort.
- pagination/URL state.
- mutation/side effect.
- selection/dialog state.

Jika hook melewati 300 baris, audit akan menandainya sebagai `hook-too-broad`.

### Service/Repository

Repository boleh mengakses Supabase. UI tidak boleh. Mapper/schema dipisah agar error data lebih mudah dilacak.

Pola:

```text
UI -> hook -> repository -> Supabase client
              mapper/schema
```

### Domain

Domain harus pure:

- tidak import React.
- tidak import Supabase.
- tidak memakai `window`, `document`, `localStorage`, router, atau toast.

Jika melanggar, audit menandainya sebagai `domain-not-pure`.

## Refactor Aman

1. Jalankan `corepack pnpm debug:map`.
2. Pilih 1 file risiko tertinggi yang masih dalam scope.
3. Pecah berdasarkan boundary di atas, bukan berdasarkan ukuran saja.
4. Jangan ubah output UI/logika kecuali bug jelas.
5. Jalankan `corepack pnpm typecheck`.
6. Jalankan `corepack pnpm build`.
7. Jika menyentuh logic uang/import/export/auth, jalankan `corepack pnpm check`.

## Artifact Debug

`docs/audits/debuggability-map.md` adalah snapshot yang bisa dibaca manusia. File ini boleh diperbarui dengan:

```bash
corepack pnpm debug:map:md
```

Jangan edit manual bila hanya ingin memperbarui angka statistik. Edit manual hanya untuk menambah keputusan arsitektur.
