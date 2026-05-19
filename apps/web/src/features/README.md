# Features

Folder ini adalah target struktur feature-based bertahap untuk LIVORIA.

Aturan:

- Jangan memindahkan halaman besar sekaligus.
- Mulai dari fitur yang sedang disentuh.
- Simpan komponen, hooks, services, schemas, dan types yang spesifik fitur di folder fiturnya.
- Business logic lintas fitur tetap berada di `src/shared` atau `src/services`.
- Hindari circular dependency antar fitur.

Status awal:

- Route production masih tetap memakai `src/pages`.
- Folder fitur disiapkan untuk migrasi bertahap: `auth`, `dashboard`, `tagihan`, `anime`, `donghua`, `waifu`, `obat`, `settings`, dan `admin`.
