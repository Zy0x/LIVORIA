# LIVORIA Mobile RN Prototype

Prototype React Native/Expo untuk Phase 18. App ini sengaja minimal dan tidak menggantikan web app.

## Struktur

```text
src/
  app/
  features/
    auth/
    dashboard/
    obat/
  native/
  services/
    supabase/
  shared/
```

## Menjalankan Android

```bash
corepack pnpm install
corepack pnpm mobile:android
```

Alternatif langsung dari package:

```bash
corepack pnpm --filter @livoria/mobile-rn android
```

## Env Supabase

Gunakan public key saja:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Fallback lama `EXPO_PUBLIC_SUPABASE_ANON_KEY` didukung untuk kompatibilitas. Jangan memakai service role key di app mobile.

## Catatan Implementasi

- `@livoria/core/contracts`, `@livoria/core/domain`, dan `@livoria/core/formatters` dipakai untuk tipe `ObatItem`, `DashboardSummary`, formatter IDR, dan normalisasi obat.
- `@livoria/ui-tokens` dipakai untuk warna dan spacing dasar mobile.
- Storage auth masih memakai adapter memory placeholder agar tidak menambah dependency native di phase ini.
- Obat list membaca Supabase jika env tersedia, lalu fallback ke placeholder ketika env belum dikonfigurasi.
- Navigation masih skeleton internal tanpa React Navigation.

## Belum Diimplementasikan

- Form login/register asli.
- Session persistence native via AsyncStorage atau SecureStore.
- Dashboard summary RPC/query nyata.
- CRUD Obat mobile.
- Native Android build/EAS profile.
