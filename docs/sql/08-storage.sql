-- ============================================================
-- LIVORIA: Storage Buckets Configuration
-- ============================================================

-- Bucket untuk cover image anime/donghua
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers', 'covers', true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
);

-- Bucket untuk bukti pembayaran (struk)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'struk', 'struk', true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
);

-- Bucket untuk gambar waifu
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'waifu', 'waifu', true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
);

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('covers', 'struk', 'waifu') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id IN ('covers', 'struk', 'waifu'));

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('covers', 'struk', 'waifu') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
