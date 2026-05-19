# Shared

Folder ini berisi kode lintas fitur yang aman dipakai oleh banyak domain.

Isi yang diperbolehkan:

- `components`: komponen presentational dan state UI reusable.
- `hooks`: hooks reusable yang tidak spesifik satu fitur.
- `domain`: tipe dan aturan domain lintas fitur.
- `contracts`: kontrak data antar layer.
- `schemas`: schema validasi.
- `constants`: konstanta lintas fitur.
- `formatters`: format tanggal, mata uang, angka, dan teks.
- `validators`: validasi pure utility.
- `errors`: helper error dan fallback.

Aturan:

- Jangan taruh query Supabase langsung di `shared`.
- Jangan taruh komponen halaman besar di sini.
- Shared code tidak boleh bergantung pada route tertentu.
- Shared code yang ingin dipakai Next.js nanti tidak boleh memakai `import.meta.env` langsung.
