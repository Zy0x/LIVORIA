# AGENTS.md — LIVORIA AI Agent Operating Manual

> **Tujuan file ini:** menjadi prompt awal dan kontrak kerja untuk setiap AI Agent yang mengembangkan, memperbaiki, mengaudit, atau melakukan refactor pada project **LIVORIA — Living Information & Organized Records Archive**.
>
> File ini harus menjaga konsistensi **struktur, logika bisnis, UI/UX, responsivitas, keamanan, tech stack, testing, build, PWA, Supabase, Edge Functions, dan kualitas web** agar aplikasi tidak mengalami blank screen, regression, bug data, atau masalah keamanan.

---

## 0. Aturan Mutlak Untuk AI Agent

1. **Jangan commit, push, merge, atau membuat release kecuali user secara eksplisit memerintahkan.**
   - Boleh mengedit file lokal.
   - Boleh membuat patch/diff.
   - Boleh menjalankan test/build.
   - Jangan menjalankan `git commit`, `git push`, `git merge`, `git rebase`, `gh pr create`, atau aksi Git destruktif tanpa izin eksplisit.

2. **Selalu pahami konteks sebelum mengubah kode.**
   - Baca file terkait terlebih dahulu.
   - Cari import, dependensi, tipe, service, SQL, dan pemanggil komponen.
   - Jangan melakukan perubahan “tebak-tebakan”.

3. **Jaga aplikasi tetap bisa dibuka.**
   - Prioritas utama: tidak blank screen.
   - Pastikan route utama, auth flow, dashboard, dan halaman besar tetap render.
   - Tangani error state, loading state, empty state, dan env missing secara aman.

4. **Selesaikan akar masalah, bukan hanya gejala.**
   - Fix harus konsisten dengan data model, service layer, UI, RLS, storage, dan Edge Function.
   - Jangan menambahkan workaround yang merusak arsitektur.

5. **Tidak boleh membocorkan secret.**
   - Jangan hardcode key, token, anon key, service role key, admin key, Telegram token, Groq/Gemini key, atau kredensial apa pun.
   - Jangan menulis secret ke log, UI, localStorage/sessionStorage baru, file test, README, atau fixture.

6. **Gunakan tech stack yang sudah ada. Jangan mengganti framework besar tanpa izin.**
   - Tetap Vite + React + TypeScript + Tailwind + shadcn/Radix + Supabase + React Query.
   - Jangan migrasi ke Next.js, Redux, Prisma, Firebase, atau backend lain tanpa perintah eksplisit.

7. **Setiap perubahan harus bisa diverifikasi.**
   - Minimal jalankan typecheck/build atau jelaskan kenapa tidak bisa.
   - Untuk perubahan logika, tambahkan atau sesuaikan test bila memungkinkan.
   - Jangan klaim “berhasil” jika belum diuji.

8. **Utamakan kompatibilitas mobile.**
   - LIVORIA banyak dipakai sebagai personal archive/PWA; UI harus nyaman di mobile, tablet, dan desktop.
   - Semua tombol penting harus mudah disentuh, modal tidak overflow, dropdown tidak keluar layar.

9. **Jaga bahasa dan nuansa produk.**
   - UI utama berbahasa Indonesia.
   - Pertahankan gaya personal, rapi, modern, ringan, dan produktif.
   - Jangan mencampur istilah Inggris secara berlebihan kecuali istilah teknis yang sudah digunakan: Watchlist, Backup, Restore, Import, Export, Admin Panel.

10. **Saat memperbaiki bug, tulis ringkasan akhir yang jelas.**
    - File yang diubah.
    - Masalah yang diperbaiki.
    - Test/build yang dijalankan.
    - Risiko tersisa bila ada.

---

## 1. Identitas Project

**Nama:** LIVORIA
**Kepanjangan:** Living Information & Organized Records Archive
**Jenis:** Personal archive web app / PWA
**Bahasa UI utama:** Indonesia
**Domain fitur:**

- Tagihan / hutang-piutang / cicilan.
- Anime database.
- Donghua database.
- Watchlist anime/donghua.
- Waifu tier collection.
- Obat-obatan personal archive.
- Backup/import/export data.
- Admin monitoring dan backup.
- Telegram notification bot.
- AI-assisted title enrichment dan bulk import.
- PWA/offline support.

Tujuan produk: menjadi aplikasi arsip pribadi yang cepat, aman, responsif, mudah digunakan, dan tetap stabil meskipun data semakin banyak.

---

## 2. Tech Stack Resmi

Gunakan dan pertahankan stack berikut:

### Frontend

- React 18
- TypeScript
- Vite
- React Router DOM v6
- TanStack React Query v5
- Tailwind CSS
- shadcn/Radix UI primitives
- lucide-react icons
- GSAP untuk animasi
- Recharts untuk grafik
- Sonner / toast system yang sudah ada
- React Hook Form + Zod bila form kompleks membutuhkan validasi skema

### Backend / Cloud

- Supabase Auth
- Supabase Database / PostgreSQL
- Supabase Row Level Security
- Supabase Storage
- Supabase Edge Functions
- pg_cron + pg_net untuk scheduler tertentu

### Export / Import

- JSON
- CSV
- XLSX
- jsPDF + autotable

### PWA

- vite-plugin-pwa
- manual `manifest.json`
- manual `public/sw.js`

### Testing / Quality

- Vitest
- Testing Library
- ESLint
- TypeScript project build
- Vite production build

### Package Manager

Gunakan **pnpm**.

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm check
```

`pnpm check` adalah validasi lengkap:

```bash
vitest run && eslint . && tsc --build --pretty false && vite build
```

---

## 3. Struktur Project Yang Harus Dipertahankan

Jangan memindahkan file besar tanpa alasan kuat. Ikuti struktur berikut:

```text
src/
  App.tsx
  main.tsx
  index.css

  pages/
    Auth.tsx
    Dashboard.tsx
    Tagihan.tsx
    Anime.tsx
    Donghua.tsx
    Waifu.tsx
    Obat.tsx
    Settings.tsx
    Admin.tsx
    PWASettings.tsx
    NotFound.tsx

  components/
    tagihan/
    shared/
    ui/
    TelegramSettings.tsx
    ImportExportButton.tsx
    ErrorBoundary.tsx
    Layout.tsx
    Navigation.tsx
    Breadcrumb.tsx

  hooks/
    useAuth.tsx
    useBackGesture.ts
    useReducedMotion.ts
    useWatchedAutoRemove.ts
    useTitleLanguage.ts
    useAlternativeTitles.ts

  lib/
    supabase.ts
    supabase-service.ts
    types.ts
    tagihan-cycle.ts
    import-export.ts
    titleGrouping.ts
    alternativeTitlesSearch.ts
    genres.ts
    motion.ts
    external.ts

  integrations/
    supabase/
      client.ts

supabase/
  functions/
    admin-auth/
    admin-backup/
    ai-titles/
    bulk-import-ai/
    telegram-tagihan/

public/
  sw.js
  icons/

.github/workflows/
  sync.yml

docs/sql/
```

### Prinsip Struktur

- `pages/` berisi halaman route-level.
- `components/` berisi reusable UI dan feature components.
- `components/tagihan/` khusus domain tagihan.
- `components/shared/` untuk komponen lintas domain.
- `components/ui/` untuk shadcn/Radix primitives.
- `hooks/` untuk stateful reusable logic.
- `lib/` untuk pure utilities, service wrapper, business logic, import/export, dan integration helper.
- `supabase/functions/` untuk Edge Functions, jangan campur dengan frontend.
- `docs/sql/` untuk SQL manual/migration reference.

---

## 4. Arsitektur Runtime

### Entry Point

`src/main.tsx`:

- Inisialisasi reduced-motion GSAP.
- Render `<App />`.
- Jangan menambahkan logic berat di sini.
- Jangan membuat network call langsung di entry point.

### App Shell

`src/App.tsx` harus tetap menjadi pusat:

- `QueryClientProvider`
- `AuthProvider`
- `TooltipProvider`
- `ErrorBoundary`
- Router
- Lazy pages
- Global effects seperti `useWatchedAutoRemove`
- Toaster

### Routing

Route publik:

- `/auth`
- `/admin`

Route protected:

- `/`
- `/tagihan`
- `/anime`
- `/anime/:pageParam`
- `/donghua`
- `/donghua/:pageParam`
- `/waifu`
- `/obat`
- `/settings`

Jika menambah route:

1. Pastikan route masuk ke struktur auth yang tepat.
2. Pastikan lazy import aman.
3. Pastikan ada loading fallback.
4. Pastikan navigation/breadcrumb ikut diperbarui bila perlu.
5. Pastikan SPA redirect deployment tetap bekerja.

---

## 5. Supabase Client & Auth Rules

### Env Frontend

Frontend hanya boleh memakai:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
# atau fallback lama
VITE_SUPABASE_ANON_KEY=
```

Jangan pernah expose:

```env
SUPABASE_SERVICE_ROLE_KEY
ADMIN_KEY
TELEGRAM_BOT_TOKEN
GROQ_API_KEY
GEMINI_API_KEY
```

### Auth Flow

`useAuth.tsx` adalah sumber kebenaran auth frontend:

- `user`
- `session`
- `loading`
- `signIn`
- `signInWithGoogle`
- `signUp`
- `signOut`

Jangan membuat auth state paralel yang tidak sinkron.

### Protected Route

Semua halaman data personal harus protected. Jangan fetch data personal sebelum user valid.

### Admin Auth

Admin saat ini memakai Edge Function `admin-auth` dan session `livoria_admin` di `sessionStorage`. Jika memperbaiki admin auth:

- Jangan simpan admin key plaintext di localStorage.
- Lebih aman gunakan short-lived token dari server.
- Validasi admin harus terjadi server-side.
- Jangan memberi akses admin hanya berdasarkan flag client.

---

## 6. Data Model Resmi

### Tagihan

Field penting:

- `id`
- `user_id`
- `debitur_nama`
- `debitur_kontak`
- `barang_nama`
- `harga_awal`
- `bunga_persen`
- `jangka_waktu_bulan`
- `cicilan_per_bulan`
- `tanggal_mulai`
- `tanggal_jatuh_tempo`
- `tanggal_mulai_bayar`
- `status`: `aktif | lunas | overdue | ditunda`
- `total_dibayar`
- `total_hutang`
- `sisa_hutang`
- `keuntungan_estimasi`
- `denda_persen_per_hari`
- `catatan`
- `metode_pembayaran`
- `sumber_modal`: `modal_terpisah | modal_bergulir | dana_luar`
- `jenis_tempo`: `bulanan | berjangka`
- `tgl_bayar_tanggal`
- `tgl_tempo_tanggal`
- `tgl_bayar_hari`
- `tgl_tempo_hari`
- `kuantitas`

### Tagihan History

- `tagihan_id`
- `user_id`
- `aksi`
- `detail`
- `jumlah`

### Struk

- `tagihan_id`
- `user_id`
- `file_url`
- `file_name`
- `file_type`
- `keterangan`

### Anime / Donghua

Field penting:

- `title`
- `status`: `on-going | completed | planned`
- `genre`
- `rating`
- `episodes`
- `episodes_watched`
- `cover_url`
- `synopsis`
- `notes`
- `season`
- `cour`
- `streaming_url`
- `schedule`
- `parent_title`
- `is_favorite`
- `is_bookmarked`
- `is_movie`
- `duration_minutes`
- `is_hentai`
- `release_year`
- `studio`
- `mal_url`
- `anilist_url`
- `mal_id`
- `anilist_id`
- `alternative_titles`
- `watch_status`: `none | want_to_watch | watching | watched`
- `watched_at`

### Waifu

- `name`
- `source`
- `source_type`: `anime | donghua`
- `tier`: `S | A | B | C`
- `image_url`
- `notes`

### Obat

- `name`
- `type`
- `dosage`
- `usage_info`
- `frequency`
- `side_effects`
- `notes`

---

## 7. Service Layer Rules

Gunakan `src/lib/supabase-service.ts` sebagai pusat CRUD.

### Jangan lakukan ini tanpa alasan kuat

```ts
supabase.from('anime').insert(...)
```

langsung dari banyak komponen bila sudah ada service wrapper.

### Lebih baik

```ts
animeService.create(row)
animeService.update(id, row)
animeService.delete(id)
animeService.getAll()
```

### Alasan

- `insertRow` otomatis mengambil user dan mengisi `user_id`.
- CRUD konsisten.
- Lebih mudah audit dan test.
- Lebih mudah memperbaiki RLS/storage/auth secara terpusat.

### Saat menambah tabel baru

1. Tambahkan tipe di `src/lib/types.ts`.
2. Tambahkan service di `src/lib/supabase-service.ts`.
3. Tambahkan SQL table + index + RLS.
4. Tambahkan import/export bila diperlukan.
5. Tambahkan query invalidation key yang konsisten.
6. Tambahkan UI loading/empty/error.

---

## 8. Logika Tagihan Yang Harus Dijaga

Logika tagihan berada di `src/lib/tagihan-cycle.ts`.

### Prinsip Utama

- Jangan menghitung jatuh tempo hanya dari status statis.
- Periode aktif dihitung berdasarkan jumlah cicilan yang sudah dibayar.
- `total_dibayar / cicilan_per_bulan` menentukan periode yang sudah lunas.
- Overdue dihitung dari `windowEnd` periode aktif.
- `lunas` mengakhiri reminder.
- `ditunda` tidak dianggap overdue.

### Tempo Bulanan

Tempo bulanan memakai:

- `tgl_bayar_tanggal`: tanggal mulai bisa bayar pertama.
- `tgl_tempo_tanggal`: tanggal jatuh tempo pertama.
- Jika hari tempo lebih kecil dari hari bayar, maka jendela lintas bulan.

Contoh:

- Bayar mulai 25 Maret.
- Tempo 5 April.
- Maka periode berjalan lintas bulan.

### Pembayaran

Gunakan `recordPayment(tagihan, jumlah, tanggal, keterangan)`.

Fungsi ini harus:

1. Menambah `total_dibayar`.
2. Mengurangi `sisa_hutang`.
3. Mengubah status ke `lunas` jika lunas.
4. Menulis `tagihan_history`.

### Saat mengubah logika tagihan

Wajib cek:

- Dashboard jatuh tempo.
- Tagihan quick pay.
- Tagihan laporan.
- Telegram report.
- Export/import backup.
- Status overdue visual.
- Edge case cicilan sebagian.
- Edge case bulan pendek: 29/30/31.
- Edge case lintas tahun.

---

## 9. Logika Anime/Donghua Yang Harus Dijaga

### Status Rilis vs Status Tonton

Jangan mencampur:

- `status`: status rilis media.
  - `on-going`
  - `completed`
  - `planned`

- `watch_status`: status tontonan user.
  - `none`
  - `want_to_watch`
  - `watching`
  - `watched`

Aksi “Selesai Nonton” hanya mengubah `watch_status`, bukan `status` rilis.

### Auto-remove Watchlist

`watch_status = watched` harus auto-reset ke `none` setelah 1 jam melalui `useWatchedAutoRemove`.

Jangan memindahkan polling ini ke setiap halaman jika sudah global di App. Hindari double polling.

### Episode Tracking

- `episodes`: total episode.
- `episodes_watched`: progress user.
- Untuk movie, gunakan `duration_minutes`, bukan episode.
- Tombol +/- episode harus clamp agar tidak negatif dan tidak melewati total jika total diketahui.

### Grouping

Gunakan `src/lib/titleGrouping.ts`.

Aturan:

- Serial dikelompokkan berdasarkan `parent_title` atau base title otomatis.
- Movie tanpa `parent_title` harus standalone.
- Movie dengan `parent_title` boleh masuk franchise group.
- Jangan gabungkan movie dengan serial secara otomatis.

### Alternative Titles

- `alternative_titles` disimpan sebagai JSON string.
- Search harus mempertimbangkan alternative title bila tersedia.
- Title language switch harus tetap bekerja.

### Duplicate Detection

Prioritas:

1. `mal_id`
2. `anilist_id`
3. Judul eksak case-insensitive

Jangan membuat duplicate detection terlalu agresif hingga season berbeda dianggap duplikat.

---

## 10. Import / Export Rules

### Anime/Donghua

Gunakan `src/lib/import-export.ts`.

Kontrak field CSV resmi adalah `ANIME_CSV_FIELDS`. Jangan menghapus field tanpa migrasi dan alasan kuat.

Export JSON harus roundtrip-safe:

- Semua field DB penting ikut.
- Nilai kosong konsisten sebagai `null` bila tepat.
- `watch_status`, `watched_at`, `alternative_titles`, `is_movie`, `duration_minutes`, `mal_id`, `anilist_id` harus dipertahankan.

Direct import mendukung:

- `insert_only`
- `upsert`
- `replace_all`

### Backup Settings Page

Backup user mencakup:

- `anime`
- `donghua`
- `waifu`
- `obat`
- `tagihan`
- `tagihan_history`
- `struk`

Jika memperbaiki import backup full-user, hati-hati dengan relasi:

- `tagihan_history.tagihan_id`
- `struk.tagihan_id`

Jangan menghapus `id` tagihan lalu insert history lama tanpa mapping ID.

### Admin Backup

Admin backup adalah full database backup. Karena sangat sensitif:

- Jangan expose ke user biasa.
- Jangan restore tanpa validasi.
- Jangan jadikan restore default action.
- Tambahkan konfirmasi kuat pada UI.
- Pertimbangkan backup otomatis sebelum restore.

---

## 11. Supabase SQL & RLS Rules

Setiap tabel personal wajib:

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
```

Policy minimal:

- User can view own rows.
- User can insert own rows.
- User can update own rows.
- User can delete own rows.

Pola:

```sql
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid())
```

### Jangan

- Membuat policy `USING (true)` untuk data personal.
- Membuka table personal ke public anon.
- Mengandalkan filter frontend sebagai keamanan.

### Admin / service role

- Aksi lintas user hanya boleh lewat Edge Function yang memakai service role.
- Edge Function harus memverifikasi admin secara server-side.
- Jangan percaya flag dari body seperti `isAdmin`, `isAuto`, atau `role` tanpa secret/token server-side.

---

## 12. Storage Rules

Bucket yang digunakan:

- `covers`: cover anime/donghua.
- `struk`: bukti pembayaran.
- `waifu` atau bucket waifu resmi yang disepakati.

### Path Object

Jika policy mengharuskan folder pertama adalah user id, path upload wajib:

```text
<user_id>/<folder>/<timestamp-random>.<ext>
```

Bukan:

```text
anime/<timestamp>.jpg
waifu/<timestamp>.jpg
```

### Public vs Private

- Cover anime/donghua boleh public bila memang untuk tampilan gambar.
- Waifu image bisa public jika tidak sensitif, tetapi tetap pertimbangkan privasi.
- Struk/bukti pembayaran sebaiknya private + signed URL, bukan public read.

### Saat memperbaiki upload

Cek semua pemanggil:

- Anime cover upload.
- Donghua cover upload.
- Waifu image upload.
- Struk upload.
- Delete image/file.
- Import/export yang menyimpan URL lama.

---

## 13. Edge Function Security Rules

Folder Edge Functions:

```text
supabase/functions/admin-auth/
supabase/functions/admin-backup/
supabase/functions/ai-titles/
supabase/functions/bulk-import-ai/
supabase/functions/telegram-tagihan/
```

### Aturan Umum

1. Semua secret hanya boleh diakses via `Deno.env.get()` di Edge Function.
2. Jangan return secret ke frontend.
3. Jangan log secret.
4. Validasi request body.
5. Tangani `OPTIONS` CORS.
6. Return JSON konsisten.
7. Gunakan status code tepat: 200, 400, 401, 404, 500.
8. Batasi aksi destruktif dengan verifikasi kuat.

### admin-auth

- Memvalidasi `ADMIN_EMAIL` dan `ADMIN_KEY`.
- Jangan menambahkan backdoor.
- Jangan bocorkan apakah email benar/key salah secara detail.

### admin-backup

Sangat sensitif karena memakai service role.

Wajib:

- Verifikasi admin untuk semua action manual.
- Untuk cron/auto backup, gunakan secret khusus, bukan hanya `isAuto: true` dari body.
- Jangan mengizinkan caller publik bypass auth.
- Validasi action.
- Jangan restore tabel sistem sembarangan.
- Jangan memasukkan table internal/backup_logs/settings ke backup restore bila tidak diperlukan.

### ai-titles

- Hanya gunakan Groq/Gemini key dari env.
- Parser AI response harus defensif.
- Jangan percaya output AI tanpa sanitasi.
- Jangan membuat AI menulis langsung ke DB kecuali alur sudah eksplisit dan tervalidasi.

### bulk-import-ai

- Wajib Authorization header.
- Wajib verifikasi user lewat Supabase auth.
- Batasi input besar dengan chunking.
- Sanitasi hasil sebelum insert.
- Jangan biarkan model hallucination merusak DB tanpa preview/konfirmasi UI.

### telegram-tagihan

- Telegram webhook/action memakai service role, jadi validasi action dan input wajib.
- `register`, `unregister`, `update_preferences` harus memastikan `userId` benar-benar milik caller bila dipanggil dari frontend.
- Cron action perlu secret/header scheduler agar tidak bisa dipanggil sembarang orang.
- Jangan kirim data tagihan user ke chat yang belum terhubung/aktif.

---

## 14. UI/UX Principles

### Gaya Visual

Pertahankan:

- Card-based layout.
- Rounded corners.
- Soft shadows.
- Pastel accents.
- Clear iconography dari lucide-react.
- Micro-interaction ringan.
- Bahasa Indonesia yang natural.

### Konsistensi Label

Gunakan label yang konsisten:

- Tagihan
- Anime
- Donghua
- Waifu
- Obat
- Pengaturan
- Backup
- Restore
- Import
- Export
- Watchlist
- Jatuh Tempo
- Lunas
- Overdue
- Ditunda
- Tayang
- Selesai
- Akan Rilis
- Mau Nonton
- Sedang Nonton
- Sudah Ditonton

### Loading State

Setiap halaman data harus punya loading state:

- Spinner atau skeleton.
- Jangan menampilkan layar kosong tanpa penjelasan.

### Empty State

Setiap list harus punya empty state:

- Icon.
- Pesan pendek.
- CTA tambah data bila relevan.

### Error State

Untuk operasi gagal:

- Toast destructive.
- Pesan ringkas dan bisa ditindaklanjuti.
- Jangan tampilkan stack trace ke user.
- Log detail hanya untuk development/debug internal.

### Confirmation

Aksi destruktif wajib konfirmasi:

- Delete item.
- Batch delete.
- Replace all import.
- Restore backup.
- Delete user admin.
- Delete backup admin.

Konfirmasi harus menjelaskan efeknya.

---

## 15. Responsivitas & Mobile Rules

LIVORIA harus mobile-first.

### Wajib

- Tombol interaktif penting minimal `min-h-[44px]` atau area sentuh nyaman.
- Modal max height `90vh` dan scroll internal bila konten panjang.
- Dropdown harus tidak keluar viewport.
- Table besar harus responsive atau diganti card/list di mobile.
- Grid harus adaptif: 1/2/3/4 kolom sesuai layar.
- Text panjang harus `break-words`, `truncate`, atau `line-clamp` sesuai konteks.
- Header action harus wrap, bukan overflow.
- Bottom navigation/layout tidak boleh menutup CTA penting.

### Dropdown / Portal

Untuk dropdown dalam card/list yang bisa overflow:

- Gunakan portal ke `document.body` jika perlu.
- Hitung posisi berdasar viewport.
- Tutup saat outside click, scroll, resize.
- Pastikan z-index cukup.

### Modal

- `DialogContent` harus punya batas max width.
- Pada mobile gunakan padding aman.
- Konten panjang harus `overflow-y-auto`.
- Tombol submit/cancel tetap terlihat atau mudah dicapai.

### Animasi

- Gunakan GSAP secukupnya.
- Mobile harus lebih ringan.
- Hormati reduced-motion.
- Jangan animasikan list sangat besar secara berat.
- Jangan membuat animasi menyebabkan layout shift besar.

---

## 16. Blank Screen Prevention Checklist

Sebelum menyelesaikan perubahan, pastikan tidak ada penyebab blank screen berikut:

### Import / Export

- Tidak ada import path salah.
- Tidak ada circular import baru yang berbahaya.
- Lazy import mengarah ke default export yang benar.
- Named/default import sesuai.

### Runtime Null Safety

- Jangan akses property object yang mungkin `null`/`undefined` tanpa guard.
- Data dari React Query default ke array kosong bila list.
- Modal detail tidak render jika item null.
- `document`, `window`, `localStorage`, `sessionStorage` hanya dipakai di browser-safe effect/handler bila perlu.

### Env

- Supabase env missing memang bisa throw, tetapi jangan membuat route tertentu blank karena env tambahan optional hilang.
- AI/Telegram/Admin secret missing harus error di Edge Function dengan JSON, bukan crash frontend global.

### React Query

- Query key konsisten.
- Invalidate query setelah mutation.
- Jangan membuat infinite refetch loop.
- Jangan membuat `useEffect` dependency yang memicu save terus-menerus tanpa debounce.

### Routing

- Protected route tidak redirect loop.
- Auth page redirect user login ke `/`.
- Admin page redirect admin invalid ke `/auth`.
- NotFound aman.

### CSS/Layout

- Jangan menambahkan class yang membuat root hidden permanen.
- Jangan membuat fixed overlay tanpa close.
- Jangan membuat z-index overlay menutup semua halaman.

### Error Boundary

- Pertahankan `ErrorBoundary` di shell.
- Bila halaman besar rawan error, pecah komponen atau tambah fallback lokal.

---

## 17. State Management Rules

Gunakan state lokal React untuk UI state:

- Modal open/close.
- Filter.
- Sort.
- Search.
- Selected item.
- Batch selection.

Gunakan React Query untuk server state:

- `tagihan`
- `anime`
- `donghua`
- `waifu`
- `obat`
- `struk`
- `history`
- admin stats/backups/users bila relevan

Jangan menduplikasi server state ke local state kecuali untuk editing form atau selected snapshot.

### Query Keys

Gunakan key konsisten:

```ts
['tagihan']
['anime']
['donghua']
['waifu']
['obat']
['struk', tagihanId]
['history', tagihanId]
```

Setelah mutation:

```ts
queryClient.invalidateQueries({ queryKey: ['anime'] })
```

Jangan invalidate semua query kecuali import besar/restore global.

---

## 18. Form Rules

### General

- Gunakan controlled input untuk form yang sudah ada.
- Validasi required field sebelum submit.
- Disable submit saat mutation pending/uploading.
- Reset form setelah sukses.
- Jangan reset saat error.

### Number / Currency

- Format IDR untuk display.
- Simpan number bersih ke DB.
- Hindari `NaN`.
- Clamp nilai negatif bila tidak valid.

### Date

- Simpan format `YYYY-MM-DD` untuk date input.
- Hindari timezone bug saat hanya butuh tanggal lokal.
- Untuk display gunakan `id-ID`.

### File Upload

- Validasi MIME bila perlu.
- Preview object URL harus dibersihkan bila dibuat banyak.
- Upload harus menampilkan state uploading.
- Delete file lama bila alur memang mengganti file dan storage path valid.

---

## 19. PWA Rules

Project memakai `public/sw.js` dan `vite-plugin-pwa`.

### Jangan merusak Service Worker

- Jangan cache API Supabase auth/data secara sembarangan.
- Supabase harus network-first atau skip cache untuk operasi sensitif.
- Navigation fallback harus tetap ke `/index.html` agar route SPA tidak 404.
- Saat update cache version, pastikan cleanup cache lama tetap bekerja.

### Offline Behavior

- Static assets boleh cache.
- Images boleh stale-while-revalidate.
- API data personal jangan dianggap always safe untuk cache permanen.
- Offline response harus jelas, bukan blank.

### Manifest

Jaga:

- `name`
- `short_name`
- `start_url`
- `scope`
- `display: standalone`
- icons lengkap
- shortcuts ke Tagihan, Anime, Donghua

---

## 20. Performance Rules

### Halaman Besar

`Anime.tsx` dan `Donghua.tsx` sangat besar. Saat menambah fitur:

- Pertimbangkan pecah komponen.
- Gunakan `useMemo` untuk derived data besar.
- Gunakan `useCallback` untuk handler yang dilempar ke banyak card.
- Gunakan pagination tetap.
- Hindari filter/sort berat di render tanpa memo.
- Hindari animasi GSAP berat untuk ribuan card.

### Build Chunking

Vite sudah memisahkan chunk vendor. Jangan menambahkan dependency besar tanpa alasan.

### Images

- Pakai `loading="lazy"` untuk gambar list.
- Gunakan ukuran container stabil agar layout tidak shift.

### Search

- Debounce search jika data besar.
- Search alternative titles harus efisien.

---

## 21. Accessibility & Interaction

- Tombol harus memakai `<button>`, bukan div clickable.
- Input harus punya label atau konteks yang jelas.
- Dialog harus punya title dan description bila memakai Radix Dialog.
- Icon-only button harus punya `title` atau accessible label.
- Jangan menghilangkan focus outline tanpa pengganti.
- Gunakan warna + teks/icon, jangan hanya warna untuk status.
- Pastikan kontras teks cukup di light/dark mode.

---

## 22. Security Hardening Priorities

Jika AI Agent diminta fixing/security, prioritaskan masalah berikut:

### P0 — Admin Auto Bypass

Jangan izinkan `admin-backup` bypass admin hanya karena body berisi:

```json
{ "isAuto": true }
```

Solusi yang disarankan:

- Tambahkan secret khusus cron, misalnya `AUTO_BACKUP_SECRET`.
- Cron mengirim header/body secret.
- Edge Function memverifikasi secret tersebut.
- Manual admin tetap butuh admin email/key atau token admin server-side.

### P0 — Restore Destruktif

Restore full DB harus:

- Validasi `_meta.app === 'LIVORIA'`.
- Validasi tabel yang boleh direstore.
- Backup dulu sebelum restore.
- Hindari restore tabel internal kecuali perlu.
- Gunakan transaksi/RPC bila memungkinkan.
- Return error detail aman.

### P1 — Storage Path Mismatch

Jika policy storage mensyaratkan folder pertama user id, upload helper harus membuat path:

```text
<user.id>/<bucket-or-feature>/<file>
```

### P1 — Bucket Waifu Mismatch

Samakan bucket UI dan SQL:

- Opsi A: ubah kode ke `waifu`.
- Opsi B: buat bucket `waifu-images` + policy.

Pilih satu, jangan dua-duanya tanpa alasan.

### P1 — Public Struk

Pertimbangkan private bucket untuk struk.

### P1 — Telegram Function Trust Boundary

Aksi `register`, `unregister`, dan `update_preferences` harus memastikan caller berhak mengubah user tersebut.

### P2 — Data Type / SQL Type Drift

Pastikan TypeScript dan SQL cocok:

- `sumber_modal` harus mendukung `dana_luar` bila UI/types memakainya.
- `is_hentai` harus ada di anime/donghua jika UI memakainya.
- Bucket dan field import/export harus sesuai DB.

---

## 23. Testing & Build Protocol

### Setelah Perubahan Kecil

Jalankan minimal:

```bash
pnpm typecheck
pnpm build
```

### Setelah Perubahan UI/Komponen

Jalankan:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

### Setelah Perubahan Logic / Utility

Jalankan:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Tambahkan test bila logic cukup penting, terutama:

- `tagihan-cycle.ts`
- `titleGrouping.ts`
- `import-export.ts`
- parser AI response
- helper date/currency

### Setelah Perubahan Besar / Sebelum Selesai

Jalankan:

```bash
pnpm check
```

Jika `pnpm check` gagal:

1. Baca error pertama.
2. Fix akar masalah.
3. Jalankan ulang command terkait.
4. Jangan menyembunyikan error.

Jika tidak bisa menjalankan test/build karena environment terbatas:

- Katakan dengan jelas.
- Jelaskan command yang seharusnya dijalankan.
- Jelaskan risiko yang belum tervalidasi.

---

## 24. Manual Smoke Test Checklist

Setelah build sukses, lakukan smoke test manual bila memungkinkan:

### Auth

- `/auth` terbuka.
- Login form render.
- Toggle password bekerja.
- Google login button tidak crash.
- User login redirect ke `/`.
- Logout dari settings bekerja.

### Dashboard

- `/` render tanpa blank.
- Summary card muncul.
- Data kosong tidak crash.
- Quick pay modal aman.

### Tagihan

- `/tagihan` render.
- Tab Daftar/Laporan/Kalkulator berpindah.
- Add tagihan modal buka/tutup.
- Search/filter/sort tidak crash.
- Detail tagihan aman.
- Quick pay menulis history.
- Upload struk tidak crash.

### Anime

- `/anime` render.
- Grid/list toggle aman.
- Search/filter/sort aman.
- Add/edit modal aman.
- Watch status update.
- Episode +/- aman.
- Import/export menu aman.
- Stack detail modal aman.

### Donghua

Sama seperti Anime.

### Waifu

- `/waifu` render.
- Filter tier/source aman.
- Add/edit/delete modal aman.
- Upload image sesuai bucket/policy.

### Obat

- `/obat` render.
- Add/edit/delete/detail aman.
- Filter tipe/frekuensi aman.

### Settings

- `/settings` render.
- Theme toggle aman.
- Backup data menghasilkan file.
- Import dialog aman.
- Telegram settings render.
- PWA settings render.

### Admin

- `/admin` tanpa session redirect ke `/auth`.
- Dengan session valid, statistik render.
- Backup list render.
- Restore butuh konfirmasi.

### PWA

- Manifest terbaca.
- Service worker tidak memblokir route.
- Refresh pada route nested tidak 404.

---

## 25. Code Style Rules

### TypeScript

- Hindari `any` jika tipe bisa dibuat dengan mudah.
- `any` boleh untuk payload Supabase/AI yang memang dinamis, tetapi sanitasi segera.
- Jangan ignore error TypeScript dengan `// @ts-ignore` kecuali benar-benar perlu dan diberi alasan.
- Gunakan union type untuk status enum.

### React

- Komponen harus pure sebisa mungkin.
- Side effect di `useEffect`.
- Cleanup event listener/timer.
- Jangan membuat `useEffect` tanpa dependency yang benar.
- Jangan membuat state update setelah unmount.

### Naming

- File page PascalCase: `Anime.tsx`.
- Hook camelCase diawali `use`.
- Service object: `animeService`, `tagihanService`.
- Utility function deskriptif: `getReminderStatus`, `buildGroupMap`.

### Comments

Komentar boleh, tetapi harus menjelaskan alasan/logika kompleks, bukan mengulang kode.

---

## 26. Design System & Styling Rules

Gunakan Tailwind class yang sudah konsisten di project:

- `page-header`
- `page-subtitle`
- `stat-card`
- `glass-card`
- `bg-card`
- `text-foreground`
- `text-muted-foreground`
- `border-border`
- `bg-primary`
- `text-primary`
- `text-success`
- `text-info`
- `text-warning`
- `text-destructive`

Jangan hardcode warna sembarangan jika token theme tersedia.

Jika butuh warna custom untuk genre atau badge, pastikan light/dark tetap terbaca.

---

## 27. Admin Panel Rules

Admin panel hanya untuk pengembang/admin.

Fitur:

- Statistik tabel.
- Backup manual.
- Backup otomatis.
- Restore.
- List backup.
- Delete backup.
- Users review.
- User detail.
- Delete user.

### Jangan

- Menampilkan admin panel ke user biasa.
- Menyimpan admin secret lebih lama dari perlu.
- Menghapus user tanpa konfirmasi.
- Restore tanpa validasi file.
- Menampilkan service role/secret ke UI.

### Saat mengubah admin

Cek Edge Function dan UI bersama-sama. Jangan hanya ubah frontend bila security boundary ada di backend.

---

## 28. Telegram Bot Rules

Bot command:

- `/start`
- `/help`
- `/status`
- `/tempo`
- `/tempo detail`
- `/laporan`
- `/laporan detail`
- `/overdue`
- `/overdue detail`

Cron action:

- `monthly_report`
- `daily_reminder`
- `overdue_alert`

Frontend action:

- `register`
- `test`
- `unregister`
- `get_subscription`
- `update_preferences`

### Saat mengubah Telegram

- Jangan kirim data ke chat yang tidak aktif.
- Validasi `chat_id`.
- Pastikan user hanya mengubah subscription miliknya.
- Jangan membuat spam notification.
- Format pesan HTML harus valid.
- Escape input user bila dimasukkan ke HTML Telegram.

---

## 29. AI Import / AI Titles Rules

AI dipakai untuk membantu, bukan sebagai sumber kebenaran absolut.

### Prinsip

- AI output harus di-parse defensif.
- JSON harus divalidasi.
- Field harus disanitasi sebelum insert.
- User harus bisa review hasil import.
- Fallback model boleh, tetapi jangan infinite retry.
- Timeout harus ada.

### Jangan

- Menulis hasil AI langsung ke DB tanpa sanitasi.
- Menganggap semua title AI benar.
- Menyimpan prompt yang berisi data sensitif bila tidak perlu.

---

## 30. Fixing Workflow Untuk AI Agent

Saat user meminta fix/ubah fitur:

### Step 1 — Pahami masalah

- Identifikasi halaman/fitur.
- Cari file terkait.
- Cari service/util yang dipakai.
- Cari SQL/Edge Function bila menyentuh backend.

### Step 2 — Reproduksi secara mental atau runtime

- Baca alur data dari UI → service → Supabase/Edge Function → UI update.
- Cari kemungkinan null, mismatch type, env, RLS, storage, or query issue.

### Step 3 — Rancang fix minimal tapi benar

- Jangan refactor besar jika bug kecil.
- Jangan menambah dependency tanpa izin.
- Jangan mengubah behavior unrelated.

### Step 4 — Implementasi

- Edit file terkait.
- Jaga style existing.
- Tambahkan guard/error state.
- Update tipe bila perlu.
- Update SQL/doc bila data model berubah.

### Step 5 — Verifikasi

- Jalankan command sesuai scope.
- Manual smoke test route terkait.
- Pastikan no blank screen.

### Step 6 — Ringkasan

Akhir jawaban harus memuat:

- Perubahan utama.
- File yang disentuh.
- Command test/build yang dijalankan.
- Hasilnya.
- Risiko tersisa.

---

## 31. Common Bug Patterns & Cara Mencegah

### Blank screen setelah deploy

Kemungkinan:

- Import default/named salah.
- Lazy page tidak punya default export.
- Env Supabase missing.
- Error di module top-level.
- Browser API dipakai saat import/module eval.
- Circular dependency.
- Service worker cache lama.

Fix:

- Cek console stack.
- Jalankan `pnpm build`.
- Pastikan ErrorBoundary menangkap error.
- Clear SW cache bila masalah cache.

### Data tidak muncul

Kemungkinan:

- RLS menolak select.
- Query key salah.
- User belum login.
- `user_id` tidak terisi saat insert.
- Tabel/kolom belum ada.

Fix:

- Cek service insert menambahkan `user_id`.
- Cek SQL RLS.
- Cek Supabase error di toast/log.

### Upload gagal

Kemungkinan:

- Bucket tidak ada.
- Bucket name mismatch.
- Policy path tidak cocok.
- MIME tidak diizinkan.
- File terlalu besar.

Fix:

- Samakan bucket kode dan SQL.
- Path harus diawali user id jika policy begitu.
- Tampilkan error upload.

### Modal/dropdown keluar layar

Fix:

- Gunakan portal.
- Hitung posisi fixed.
- Beri max height dan overflow.
- Tutup pada scroll/resize/outside click.

### Import gagal

Kemungkinan:

- Enum tidak cocok.
- Field baru belum ada di DB.
- FK lama putus.
- CSV parse gagal.
- `id` dihapus padahal dibutuhkan relasi.

Fix:

- Sanitasi enum.
- Mapping ID untuk relational import.
- Batch insert dengan error reporting.

---

## 32. Definition of Done

Perubahan dianggap selesai hanya jika:

- Masalah utama teratasi.
- Tidak ada regression jelas.
- Tidak ada blank screen pada route terkait.
- TypeScript tidak error untuk scope yang diuji.
- Build sukses atau alasan gagal jelas.
- UI mobile tetap layak.
- Security boundary tidak melemah.
- Data model TypeScript, SQL, service, dan UI tetap konsisten.
- Ringkasan akhir jelas.
- Tidak ada commit/push tanpa izin.

---

## 33. Instruksi Khusus Untuk Session AI Agent Baru

Gunakan prompt awal berikut saat memulai session baru:

```text
Anda adalah AI Agent untuk project LIVORIA.
Baca AGENTS.md ini terlebih dahulu dan patuhi semua aturan di dalamnya.
Tugas utama Anda adalah menjaga LIVORIA tetap stabil, aman, responsif, dan bisa di-build.
Jangan commit/push tanpa izin eksplisit.
Sebelum mengubah kode, pahami struktur file, tipe, service layer, SQL, Edge Functions, dan UI terkait.
Setiap perubahan harus menjaga:
- React/Vite/TypeScript build tetap aman.
- Supabase Auth/RLS/storage tetap benar.
- UI mobile/desktop tetap responsif.
- Tidak ada blank screen.
- Query/mutation React Query tetap konsisten.
- Import/export dan backup tidak merusak data.
- Security boundary admin/telegram/edge functions tidak melemah.
Setelah implementasi, jalankan test/typecheck/lint/build sesuai scope dan laporkan hasilnya.
Jika command tidak dapat dijalankan, jelaskan dengan jujur dan berikan command yang harus dijalankan user.
```

---

## 34. Checklist Cepat Sebelum Menjawab User

Sebelum memberi jawaban final setelah coding/fix:

- [ ] Tidak ada commit/push.
- [ ] File yang diubah sesuai scope.
- [ ] Tidak ada secret di kode.
- [ ] Tidak ada import rusak.
- [ ] Tidak ada route blank screen yang jelas.
- [ ] Loading/empty/error state aman.
- [ ] Mobile layout aman.
- [ ] RLS/security tidak dilemahkan.
- [ ] Query invalidation benar.
- [ ] Test/build sudah dijalankan atau keterbatasan dijelaskan.
- [ ] Ringkasan final singkat dan akurat.

---

## 35. Prioritas Perbaikan Strategis LIVORIA

Jika user meminta “rapikan”, “audit”, “fix semua”, atau “stabilkan”, urutan prioritas:

1. **Security P0:** perbaiki bypass `isAuto` di `admin-backup`.
2. **Security/Data P0:** harden restore full DB.
3. **Storage P1:** samakan bucket waifu dan path upload dengan policy.
4. **Privacy P1:** evaluasi bucket public untuk struk.
5. **Import P1:** perbaiki import Settings agar relasi `tagihan_history`/`struk` aman.
6. **Data drift P2:** sinkronkan enum/kolom TypeScript dan SQL.
7. **Stability:** tambah guard null/error di halaman besar.
8. **Testing:** tambah unit test untuk `tagihan-cycle`, `titleGrouping`, dan `import-export`.
9. **Docs:** lengkapi README setup/deploy/env/SQL/function/cron.
10. **Performance:** pecah `Anime.tsx` dan `Donghua.tsx` jika mulai sulit maintain.

---

## 36. Perintah Yang Tidak Boleh Dijalankan Tanpa Izin

```bash
git commit
git push
git merge
git rebase
git reset --hard
git clean -fd
gh pr create
gh release create
supabase db reset
supabase db push
supabase functions deploy
netlify deploy --prod
```

Boleh menyarankan command tersebut, tetapi jangan menjalankannya tanpa perintah eksplisit.

---

## 37. Perintah Yang Umumnya Aman Untuk Validasi Lokal

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm preview
```

Catatan:

- `pnpm install` boleh mengubah lockfile jika dependency berubah. Jangan ubah dependency tanpa izin.
- `pnpm preview` hanya untuk smoke test lokal.

---

## 38. Penutup

LIVORIA harus diperlakukan sebagai aplikasi personal archive yang menyimpan data sensitif: finansial, koleksi pribadi, obat, dan preferensi user. Setiap perubahan harus menjaga kepercayaan, stabilitas, keamanan, dan kenyamanan penggunaan.

AI Agent harus bekerja hati-hati, eksplisit, dan terukur: pahami dulu, ubah seperlunya, uji, lalu laporkan hasil dengan jujur.
