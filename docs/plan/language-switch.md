# Plan: Title Language Switch — Anime & Donghua

## Tujuan
Setiap pengguna dapat memilih bahasa tampilan judul di halaman Anime dan Donghua secara terpisah. Preferensi disimpan per akun di database Supabase.

## Pilihan Bahasa
| Key | Label | Sumber |
|---|---|---|
| `original` | Resmi/Default | `title` (judul yang disimpan user) |
| `english` | Inggris | `alternative_titles.title_english` |
| `romaji` | Jepang (Romaji) / Pinyin | `alternative_titles.title_romaji` |
| `native` | Kanji / Hanzi | `alternative_titles.title_native` |
| `indonesian` | Indonesia | `alternative_titles.title_indonesian` |

## Database Schema
```sql
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  anime_title_lang TEXT DEFAULT 'original',
  donghua_title_lang TEXT DEFAULT 'original',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
```

## Cara Kerja
1. **Load preferensi** saat user login → `useQuery(['user-preferences'])`.
2. **Tombol switch bahasa** ditampilkan di header halaman Anime dan Donghua (terpisah).
3. **Resolusi judul** pada setiap card:
   - Parse `alternative_titles` JSON → `AlternativeTitles` object.
   - Ambil field sesuai `anime_title_lang` / `donghua_title_lang`.
   - Fallback ke `title` (original) jika field target kosong/null.
4. **Simpan perubahan** → `upsert` ke `user_preferences`.
5. **Preferensi terpisah**: `anime_title_lang` dan `donghua_title_lang` independen.

## UI
- Dropdown kecil di sebelah search bar atau di header card.
- Ikon 🌐 + label bahasa aktif.
- Perubahan langsung terlihat tanpa reload (reactive via state).

## Fallback Chain
```
preferred_lang → title_english → title_romaji → stored_title
```

## Status
🟡 Rencana — belum diimplementasikan. Butuh migrasi SQL dan UI component baru.
