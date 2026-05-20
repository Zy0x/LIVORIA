# Services

Folder ini adalah target awal untuk service layer lintas platform.

Rencana pembagian:

- `supabase`: adapter Supabase, query helpers, storage helpers, dan edge function wrappers.
- `platform`: helper browser/runtime seperti PWA, cache, chunk recovery, dan capability checks.

Aturan:

- Jangan simpan secret di service client.
- Service yang berjalan di browser hanya boleh memakai public env.
- Service yang akan dipakai Next.js nanti harus punya adapter browser/server yang jelas.
- Migrasi dari `src/lib` dilakukan bertahap saat file terkait disentuh.
