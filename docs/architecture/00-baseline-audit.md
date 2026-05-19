# LIVORIA Phase 0 Baseline Audit

Tanggal audit: 2026-05-19

Scope audit ini hanya memetakan kondisi baseline project `remix-of-livoria`.
Tidak ada refactor, perubahan production code, deploy, commit, atau penghapusan file pada phase ini.

## 1. Struktur Repo Saat Ini

Root project utama:

```text
remix-of-livoria/
  .github/workflows/
  docs/
    sql/
    architecture/
  public/
    icons/
    sw.js
  src/
    components/
      shared/
      tagihan/
      ui/
    hooks/
    integrations/
      supabase/
    lib/
    pages/
    test/
  supabase/
    functions/
      admin-auth/
      admin-backup/
      ai-titles/
      bulk-import-ai/
      telegram-tagihan/
  package.json
  vite.config.ts
  vitest.config.ts
  netlify.toml
  wrangler.jsonc
```

Catatan struktur:

- Struktur masih sesuai arahan `AGENTS.md`: route-level page ada di `src/pages`, reusable UI di `src/components`, domain tagihan di `src/components/tagihan`, business logic/service di `src/lib`, dan Edge Functions di `supabase/functions`.
- `docs/sql` berisi SQL manual dan beberapa file perbaikan operasional. File SQL ini perlu diperlakukan sebagai referensi operasional, bukan migration history tunggal yang sudah pasti urut.
- Ada file generated build/cache seperti `dist`, `.netlify`, `.wrangler`, `tsconfig.*.tsbuildinfo`, dan `node_modules` di workspace lokal.

## 2. Entry Point Aplikasi

### `src/main.tsx`

Tanggung jawab utama:

- Import global CSS.
- Inisialisasi reduced-motion GSAP melalui `initGSAPReducedMotion`.
- Menangani stale lazy chunk dengan listener `vite:preloadError` dan `unhandledrejection`.
- Membersihkan Cache Storage lalu reload jika lazy chunk gagal dimuat.
- Mount React root ke elemen `#root`.

Risiko baseline:

- `createRoot(document.getElementById("root")!)` memakai non-null assertion. Jika `index.html` rusak atau `#root` hilang, app akan crash sebelum ErrorBoundary.
- Recovery stale chunk memakai `sessionStorage`; jika storage browser diblokir, ada potensi error sebelum render.

### `src/App.tsx`

Tanggung jawab utama:

- `QueryClientProvider`.
- `AuthProvider`.
- `TooltipProvider`.
- Toaster global.
- `ErrorBoundary` global dan route-level.
- Lazy route pages.
- Splash screen.
- PWA manager.
- Protected route shell.
- Global `useWatchedAutoRemove`.

Baseline positif:

- Route besar sudah lazy loaded.
- Setiap route dibungkus `RouteShell` dengan `ErrorBoundary` dan `Suspense`.
- Query default sudah menghindari refetch window focus berlebihan.

Risiko baseline:

- `src/lib/supabase.ts` melempar error top-level saat env Supabase hilang. Karena `AuthProvider` bergantung pada Supabase client, missing env dapat menyebabkan blank screen sebelum app shell stabil.
- `/admin` sengaja berada di luar `ProtectedRoute` karena memakai session admin sendiri. Ini perlu terus diaudit karena admin adalah surface sensitif.

## 3. Route Utama

Route dari `src/App.tsx`:

| Route | Page | Proteksi | Fallback |
| --- | --- | --- | --- |
| `/auth` | `src/pages/Auth.tsx` | Public | `CenteredSpinner` |
| `/admin` | `src/pages/Admin.tsx` | Admin session internal | `CenteredSpinner` |
| `/` | `src/pages/Dashboard.tsx` | Supabase user | `DashboardSkeleton` |
| `/tagihan` | `src/pages/Tagihan.tsx` | Supabase user | `TagihanSkeleton` |
| `/anime` | `src/pages/Anime.tsx` | Supabase user | `AnimeGridSkeleton` |
| `/anime/:pageParam` | `src/pages/Anime.tsx` | Supabase user | `AnimeGridSkeleton` |
| `/donghua` | `src/pages/Donghua.tsx` | Supabase user | `AnimeGridSkeleton` |
| `/donghua/:pageParam` | `src/pages/Donghua.tsx` | Supabase user | `AnimeGridSkeleton` |
| `/waifu` | `src/pages/Waifu.tsx` | Supabase user | `WaifuSkeleton` |
| `/obat` | `src/pages/Obat.tsx` | Supabase user | `ObatSkeleton` |
| `/settings` | `src/pages/Settings.tsx` | Supabase user | `SettingsSkeleton` |
| nested `*` | `src/pages/NotFound.tsx` | Supabase user inside layout | `CenteredSpinner` |

Catatan:

- Ada `src/pages/Index.tsx` dan `src/pages/PWASettings.tsx`, tetapi route aktif untuk keduanya tidak terlihat di `src/App.tsx`.
- Navigation fallback deployment sudah ada di `netlify.toml`, dan Worker assets memakai `not_found_handling: "single-page-application"` di `wrangler.jsonc`.

## 4. Daftar Fitur

Fitur utama yang terpetakan:

- Auth user Supabase.
- Admin login/session terpisah.
- Dashboard ringkasan data personal.
- Tagihan, cicilan, jatuh tempo, quick pay, history, struk, laporan, kalkulator.
- Anime collection, search external, cover, alternative titles, watchlist, favorite/bookmark, import/export.
- Donghua collection dengan pola mirip anime.
- Waifu collection dan upload image.
- Obat personal archive.
- Settings: theme, backup/restore user, Telegram settings, PWA settings.
- Telegram notification bot.
- AI title enrichment dan bulk import AI.
- PWA install/update/offline behavior.
- Sync workflow ke repo publish `Zy0x/LIVORIA`.

## 5. Package Script dan Dependency Utama

Script dari `package.json`:

```bash
pnpm dev
pnpm build
pnpm build:dev
pnpm lint
pnpm preview
pnpm test
pnpm test:watch
pnpm typecheck
pnpm check
```

Dependency utama:

- Frontend: React 18, Vite, TypeScript, React Router, Tailwind, Radix/shadcn, lucide-react.
- Server state: TanStack React Query.
- Backend client: `@supabase/supabase-js`.
- Form/validation: React Hook Form, Zod.
- Animasi: GSAP.
- Charts: Recharts.
- Export/import: XLSX, jsPDF, jspdf-autotable.
- PWA: vite-plugin-pwa plus manual `public/sw.js`.

Catatan performa baseline:

- `vite.config.ts` sudah memakai manual chunks untuk React, UI, form, charts, utils, Supabase/React Query.
- `xlsx`, `jspdf`, dan `recharts` masih ada sebagai dependency besar; sebagian sudah dipisah ke chunk, tetapi pemanggil heavy import tetap perlu diaudit per fitur sebelum refactor lanjutan.

## 6. Service Supabase dan Hooks Utama

### Client

- `src/lib/supabase.ts`: membuat Supabase client browser dari `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` atau fallback `VITE_SUPABASE_ANON_KEY`.
- `src/integrations/supabase/client.ts`: re-export client dari `src/lib/supabase.ts`.

Catatan security:

- Frontend tidak boleh memakai service role. Pada baseline, service role dipakai di Edge Functions, bukan client.
- `src/lib/supabase.ts` masih memakai fallback `VITE_SUPABASE_ANON_KEY`. Ini kompatibilitas lama, tetapi target jangka panjang lebih baik pakai publishable key jika sudah tersedia.

### Service layer

`src/lib/supabase-service.ts` menyediakan:

- Generic `fetchAll`, `insertRow`, `updateRow`, `deleteRow`.
- `tagihanService`.
- `strukService`.
- `historyService`.
- `recordPayment`.
- `calculateTagihan`.
- `reverseCalculateTagihan`.
- `animeService`.
- `donghuaService`.
- `waifuService`.
- `obatService`.
- `uploadImage`.
- `deleteImage`.

Catatan:

- `insertRow` mengisi `user_id` dari Supabase Auth.
- Beberapa page/component masih melakukan query Supabase langsung, terutama Settings, Admin, TagihanDetail, TelegramSettings, hooks preference/title, import/export. Ini bukan bug otomatis, tetapi perlu diprioritaskan saat refactor agar boundary konsisten.

### Hooks utama

- `useAuth`: sumber auth user/session frontend.
- `useWatchedAutoRemove`: reset `watch_status = watched` setelah 1 jam untuk anime/donghua.
- `useAnimeSearch`, `useDonghuaSearch`: external search, translate/enrichment via `ai-titles`.
- `useAlternativeTitles`: enrichment alternative titles.
- `useTitleLanguage`: preference title language dari `user_preferences`.
- `useThemePreference`: theme preference local + Supabase.
- `usePWA`: install/update/offline helper.
- `useReducedMotion`: reduced-motion dan GSAP guard.
- `useBackGesture`, `backGestureSystem`: back gesture/modal navigation.
- `useIncrementalRender`, `useLazyImage`, `useHorizontalScroll`: performance/UX helpers.

## 7. Edge Functions

| Function | Peran | Ukuran baseline | Risiko utama |
| --- | --- | ---: | --- |
| `admin-auth` | Validasi `ADMIN_EMAIL` dan `ADMIN_KEY` | 1.7 KB | Admin credential flow masih legacy berbasis key. |
| `admin-backup` | Backup, restore, list users, delete user, backup scheduler | 13.5 KB | Service role, restore destruktif, admin/session boundary. |
| `ai-titles` | Enrichment/translate title dan synopsis via Groq/Gemini | 10 KB | AI JSON parsing, secret harus tetap server-side. |
| `bulk-import-ai` | Import besar berbasis AI dengan auth user | 15.4 KB | Input besar, output AI harus disanitasi, chunking error. |
| `telegram-tagihan` | Telegram bot, cron report, user preferences | 21.4 KB | Service role, HTML Telegram, cron/webhook/action boundary. |

Catatan dari `AGENTS.md`:

- `admin-backup` adalah P0/P1 surface karena memakai service role dan restore.
- `telegram-tagihan` sudah mempunyai guard cron secret dan user verification pada baseline terbaru, tetapi tetap kompleks dan perlu test manual Telegram.
- `ai-titles` dan `bulk-import-ai` harus tetap menjaga Groq/Gemini key hanya di Edge Function.

## 8. SQL dan RLS

File SQL utama:

- `01-tagihan.sql`
- `02-tagihan-history.sql`
- `03-struk.sql`
- `04-anime.sql`
- `05-donghua.sql`
- `06-waifu.sql`
- `07-obat.sql`
- `08-storage.sql`
- `09-rls-policies.sql`
- `10-hentai-field.sql`
- `11-user-preferences.sql`
- `12-admin-backup-system.sql`
- `13-telegram-subscriptions.sql`
- `14-dynamic-backup-scheduler.sql`
- `14-dynamic-backup-scheduler-FIXED.sql`

RLS baseline:

- `tagihan`, `tagihan_history`, `struk`, `anime`, `donghua`, `waifu`, `obat`, `user_preferences`, dan `telegram_subscriptions` memiliki RLS enable/policy di docs SQL.
- `08-storage.sql` membuat bucket `covers`, `struk`, dan `waifu`; policy upload/delete mensyaratkan folder pertama path adalah `auth.uid()`.
- `struk` di SQL dibuat private, dan service `strukService` memakai signed URL 10 menit untuk read.

Catatan risiko:

- `docs/sql` berisi beberapa file fix operasional. Perlu konsolidasi pada phase dokumentasi/migration agar tidak ada drift antara baseline SQL, fix SQL, dan database production.
- `telegram_subscriptions` doc hanya punya SELECT policy di `13-telegram-subscriptions.sql`; karena update/insert dilakukan lewat Edge Function service role, ini bisa disengaja. Jika nanti user CRUD langsung dari client, perlu policy tambahan.

## 9. File Besar dan Kompleks

File terbesar berdasarkan audit line count/ukuran:

| File | Baris | Ukuran | Catatan |
| --- | ---: | ---: | --- |
| `src/pages/Anime.tsx` | 2929 | 171.7 KB | Halaman sangat besar: state, filter, modal, list/grid, mutation, action menu. |
| `src/pages/Donghua.tsx` | 2835 | 170.2 KB | Mirip Anime; risiko duplikasi dan regression tinggi. |
| `src/components/shared/BulkImportDialog.tsx` | 2292 | 129.4 KB | Parsing import, AI chunking, review, insert; blast radius besar. |
| `src/components/tagihan/TagihanForm.tsx` | 1199 | 65.4 KB | Form kompleks, local custom method, payment/history update. |
| `src/pages/Dashboard.tsx` | 1192 | 61.3 KB | Banyak derived stats dari beberapa query. |
| `src/components/shared/AnimeExtraFields.tsx` | 820 | 45.7 KB | Search external, translate, alternative metadata. |
| `src/components/tagihan/TagihanLaporan.tsx` | 712 | 40.8 KB | Laporan, chart, date/currency aggregation. |
| `src/pages/Admin.tsx` | 709 | 39.7 KB | Admin operations, restore, backup, list users. |
| `src/components/tagihan/TagihanDetail.tsx` | 654 | 33 KB | Payment revert, struk, history. |
| `src/pages/Tagihan.tsx` | 614 | 35 KB | Orchestrator tagihan. |
| `src/lib/import-export.ts` | 588 | 20.3 KB | Import/export sanitizer dan DB insert. |
| `src/lib/tagihan-cycle.ts` | 429 | 19.4 KB | Logika domain tagihan kritikal. |
| `supabase/functions/telegram-tagihan/index.ts` | 402 | 21.4 KB | Edge Function dengan service role dan data tagihan. |

Prioritas refactor harus dimulai dari ekstraksi kecil dan testable, bukan memecah semuanya sekaligus.

## 10. Risiko Blank Screen

Risiko yang teridentifikasi tanpa mengubah kode:

1. **Missing Supabase env top-level**
   - `src/lib/supabase.ts` melempar `Missing Supabase environment variables.` saat import.
   - Karena Supabase client dipakai oleh auth provider, ini berpotensi blank sebelum UI fallback rapi.

2. **Root DOM non-null assertion**
   - `src/main.tsx` memakai `document.getElementById("root")!`.
   - Jika HTML root tidak ada, app crash sebelum ErrorBoundary.

3. **Lazy chunk stale setelah deploy**
   - Sudah ada mitigasi di `src/main.tsx` dan `ErrorBoundary`.
   - Tetap perlu smoke test setelah deploy karena PWA/SW/cache bisa menyajikan chunk lama.

4. **Large page module evaluation**
   - `Anime.tsx` dan `Donghua.tsx` sangat besar. Import error kecil pada module top-level dapat membuat route terkait jatuh ke route ErrorBoundary.

5. **Uncaught JSON parse di import/backup/admin flow**
   - Banyak parsing sudah ada try/catch, tetapi Admin restore dan Settings import tetap surface berisiko karena file user-controlled.

6. **Direct Supabase `.single()` pada data opsional**
   - `.single()` muncul di beberapa flow. Untuk data opsional, `.maybeSingle()` lebih aman agar tidak error pada row kosong.

7. **Admin session parsing**
   - `src/pages/Admin.tsx` parse `sessionStorage` admin. Sudah ada try/catch, tetapi boundary admin tetap sensitif.

8. **Browser API di module/useEffect**
   - Banyak penggunaan `window`, `document`, `localStorage`, `sessionStorage`. Karena Vite SPA browser-only, ini normal, tetapi shared code untuk future Next.js harus diekstrak tanpa browser API top-level.

9. **PWA dual strategy**
   - Project memakai `vite-plugin-pwa` dan manual `public/sw.js`. Perlu audit lanjutan agar tidak ada perilaku cache ganda yang membuat update terasa lambat.

## 11. Risiko Security dan Data Boundary

Temuan baseline untuk phase berikutnya:

- `admin-backup` tetap surface paling sensitif karena service role, backup full DB, restore, list users, dan delete user.
- `src/pages/Auth.tsx` menyimpan admin session berisi email dan key di `sessionStorage` sebagai legacy admin flow. Ini lebih baik daripada `localStorage`, tetapi masih perlu phase hardening short-lived token server-side.
- `Settings` backup/restore user melakukan direct delete/upsert dan perlu audit relasi `tagihan`, `tagihan_history`, dan `struk` agar mapping ID tidak memutus FK.
- `supabase-service.ts` masih memakai `select('*')` untuk list umum. Ini sederhana, tetapi kurang optimal saat data membesar.
- `Dashboard` menarik beberapa tabel penuh (`tagihan`, `anime`, `donghua`, `waifu`, `obat`) untuk agregasi client-side. Kandidat RPC summary.
- `docs/sql` perlu konsolidasi agar RLS/storage/backup scheduler production tidak bergantung pada file fix yang tersebar.

## 12. Prioritas Refactor

Prioritas P0/P1 berdasarkan audit:

1. **Admin backup hardening lanjutan**
   - Review restore flow end-to-end.
   - Pastikan dry-run, metadata validation, table allowlist, pre-backup, dan error response aman.
   - Evaluasi admin session agar tidak terus mengirim admin key dari sessionStorage.

2. **Blank screen prevention env/root**
   - Buat fallback env missing yang user-friendly.
   - Guard root mount tanpa non-null crash.

3. **Settings backup/import relasi**
   - Validasi full-user restore dengan mapping `oldTagihanId -> newTagihanId`.
   - Jangan hapus data sebelum file lolos validasi penuh.

4. **PWA cache/update audit**
   - Pastikan hanya satu service worker strategy yang aktif sesuai desain.
   - Pastikan Supabase/Auth/Edge Function tetap network-only.
   - Tambah manual clear cache path di UI bila belum cukup.

5. **Query optimization**
   - Pisahkan list/detail query.
   - Hindari `select('*')` pada list besar.
   - Pertimbangkan RPC dashboard summary.

6. **Anime/Donghua extraction**
   - Mulai dari pure utils dan duplicated subcomponents, bukan rewrite halaman.
   - Pertahankan behavior pagination, add overlay, title language, watchlist, import/export.

7. **BulkImportDialog split**
   - Pisahkan parser/sanitizer pure function dan tambah test.
   - UI dialog tetap satu sampai pure logic stabil.

8. **Unit test domain logic**
   - `tagihan-cycle.ts`.
   - `titleGrouping.ts`.
   - `import-export.ts`.
   - Parser AI response.

## 13. Rekomendasi Urutan Phase Berikutnya

Urutan aman setelah Phase 0:

1. **Phase 1 - Safety fixes kecil**
   - Env/root blank screen fallback.
   - Audit `.single()` yang seharusnya optional.
   - Tambah test minimal untuk util yang sudah ada.

2. **Phase 2 - Admin and backup hardening**
   - Fokus `admin-backup`, `Admin.tsx`, SQL backup scheduler.
   - Tidak menyentuh Anime/Donghua.

3. **Phase 3 - Import/export user data hardening**
   - Fokus `Settings.tsx` dan `src/lib/import-export.ts`.
   - Tambah schema validation dan ID relation mapping.

4. **Phase 4 - Query and performance**
   - Dashboard RPC/list query.
   - Anime/Donghua list/detail projection.
   - Dynamic import library berat jika masih ada top-level import.

5. **Phase 5 - Gradual feature-based extraction**
   - Ekstrak domain pure utils dulu.
   - Baru pecah UI yang stabil dan punya test.

6. **Phase 6 - Hybrid Next.js readiness**
   - Hanya setelah Vite app stabil dan `pnpm check` hijau.
   - Mulai dari shared pure package/adapters, bukan route migration langsung.

## 14. Safety Snapshot

Kondisi penting saat audit:

- Branch aktif: tidak diubah oleh phase ini.
- Ada perubahan working tree sebelum audit: `OPTIMIZATION_SUMMARY.md` terhapus. File ini tidak disentuh atau distage oleh phase ini.
- Tidak ada commit, push, deploy, atau command destruktif yang dijalankan pada phase ini.
- Output audit ini adalah satu-satunya file baru yang dibuat.

