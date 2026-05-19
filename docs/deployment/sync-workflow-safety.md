# LIVORIA Sync Workflow Safety

Workflow `.github/workflows/sync.yml` dipakai untuk menyinkronkan repo source ke repo production. Guardrail ini menjaga sync harian tetap aman, tetapi masih memberi jalur eksplisit untuk migrasi besar.

## Default Aman

- Source repo hanya boleh dari `Web-Modder/remix-of-livoria`.
- Branch source hanya boleh `main`.
- `.github`, `.env`, output build, cache, dan file rahasia tetap masuk blacklist.
- Sync otomatis dibatalkan jika jumlah file berubah terlalu besar atau file delete terlalu banyak.
- `workflow_dispatch` tetap dry-run secara default.

## Migrasi Besar Yang Disengaja

Jika nanti migrasi total memang perlu menyentuh banyak file, buat/ubah file `sync` di repo target dengan nilai eksplisit:

```text
ALLOW_LARGE_SYNC=true
ALLOW_MASS_DELETE=true
MAX_CHANGED_FILES=10000
MAX_DELETED_FILES=5000
```

Aktifkan nilai tersebut hanya untuk window migrasi. Setelah migrasi selesai, kembalikan ke default agar sync harian tidak bisa menghapus atau mengganti ribuan file tanpa sengaja.

## Checklist Sebelum Migrasi Total

1. Jalankan workflow dengan `dry_run=true`.
2. Periksa daftar file berubah dan file terhapus.
3. Pastikan `.env`, `.github`, build output, cache, dan folder deployment tidak ikut tersync.
4. Pastikan Netlify dan Cloudflare auto-build masih menunjuk ke branch production yang benar.
5. Baru jalankan sync non-dry-run setelah hasil dry-run masuk akal.
