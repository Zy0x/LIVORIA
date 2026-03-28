# LIVORIA — Rencana Pengembangan

## Deskripsi Proyek
LIVORIA (Living Information & Organized Records Archive) adalah aplikasi web personal archive yang mengelola:
- **Tagihan** — Manajemen hutang/piutang dengan cicilan, bunga, dan riwayat pembayaran
- **Anime** — Database koleksi anime dengan watchlist, grouping season, dan integrasi MAL/AniList
- **Donghua** — Database donghua (anime Cina) dengan fitur serupa anime
- **Waifu** — Tier list karakter favorit dari anime/donghua
- **Obat** — Catatan obat-obatan personal

## Arsitektur
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: TanStack React Query
- **Animasi**: GSAP
- **PWA**: Custom Service Worker + Web App Manifest

## Fitur Utama
1. Autentikasi pengguna (Supabase Auth)
2. CRUD untuk semua entitas (Tagihan, Anime, Donghua, Waifu, Obat)
3. Pencarian anime/donghua via MAL (Jikan API) dan AniList GraphQL
4. Terjemahan sinopsis otomatis (MyMemory + Groq fallback)
5. Nama alternatif (alternative_titles) untuk pencarian multi-bahasa
6. Grouping anime/donghua berdasarkan franchise/parent_title
7. Watchlist dengan status tonton terpisah dari status rilis
8. Export/import data (JSON)
9. PWA (installable, offline support, push notifications)
10. Dashboard dengan ringkasan statistik dan grafik

## Roadmap
- [ ] Optimisasi performa untuk dataset besar (virtualized list)
- [ ] Dark mode toggle di halaman utama
- [ ] Notifikasi push untuk jatuh tempo tagihan
- [ ] Integrasi kalender untuk jadwal tayang
- [ ] Social sharing untuk koleksi anime/donghua
- [ ] Backup otomatis ke cloud storage
