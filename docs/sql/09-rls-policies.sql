-- ============================================================
-- LIVORIA: Row Level Security Policies
-- ============================================================
-- Setiap tabel: user hanya bisa CRUD data milik sendiri

-- ── Tagihan ──────────────────────────────────────────────────
CREATE POLICY "Users can view own tagihan"
  ON public.tagihan FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tagihan"
  ON public.tagihan FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tagihan"
  ON public.tagihan FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tagihan"
  ON public.tagihan FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── Tagihan History ──────────────────────────────────────────
CREATE POLICY "Users can view own tagihan_history"
  ON public.tagihan_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tagihan_history"
  ON public.tagihan_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── Struk ────────────────────────────────────────────────────
CREATE POLICY "Users can view own struk"
  ON public.struk FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own struk"
  ON public.struk FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own struk"
  ON public.struk FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Anime ────────────────────────────────────────────────────
CREATE POLICY "Users can view own anime"
  ON public.anime FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own anime"
  ON public.anime FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own anime"
  ON public.anime FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own anime"
  ON public.anime FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Donghua ──────────────────────────────────────────────────
CREATE POLICY "Users can view own donghua"
  ON public.donghua FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own donghua"
  ON public.donghua FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own donghua"
  ON public.donghua FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own donghua"
  ON public.donghua FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Waifu ────────────────────────────────────────────────────
CREATE POLICY "Users can view own waifu"
  ON public.waifu FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own waifu"
  ON public.waifu FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own waifu"
  ON public.waifu FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own waifu"
  ON public.waifu FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Obat ─────────────────────────────────────────────────────
CREATE POLICY "Users can view own obat"
  ON public.obat FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own obat"
  ON public.obat FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own obat"
  ON public.obat FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own obat"
  ON public.obat FOR DELETE TO authenticated
  USING (user_id = auth.uid());
