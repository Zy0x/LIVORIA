# LIVORIA Flutter Contract Prototype

`apps/mobile-flutter` adalah prototype kontrak Flutter. App ini tidak mencoba import TypeScript langsung. Flutter mengikuti kontrak data LIVORIA dalam bentuk model Dart yang paralel dengan shared contract web/RN.

## Struktur

```text
lib/
  app/
  features/
    dashboard/
    obat/
  services/
    supabase/
  shared/
```

## Contract Yang Dibuat

- `ApiError`
- `Pagination` dan `PaginatedResult<T>`
- `DashboardSummary`
- `Obat`
- formatter `formatCurrencyIDR`, `formatCompactIDR`, dan `formatDateID`
- interface `ObatRepository`

## Menjalankan

Jika Flutter SDK tersedia:

```bash
cd apps/mobile-flutter
flutter pub get
flutter analyze
flutter test
flutter run
```

Env Supabase prototype memakai compile-time defines:

```bash
flutter run \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=...
```

Jangan memakai service role key di Flutter.

## Batasan

- Supabase client masih placeholder, belum memakai package `supabase_flutter`.
- Auth belum diimplementasikan.
- Dashboard masih placeholder.
- Obat hanya memakai repository placeholder.
- Tidak ada port semua fitur dari Web/RN.
