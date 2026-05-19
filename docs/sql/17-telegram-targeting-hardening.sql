-- ============================================================
-- LIVORIA: Telegram targeting hardening
-- ============================================================
-- Tujuan:
-- - Mencegah satu chat Telegram aktif terhubung ke lebih dari satu user.
-- - Menjaga reminder/cron tidak salah sasaran.
--
-- Jalankan manual di Supabase SQL Editor setelah memastikan tidak ada
-- duplikasi chat_id aktif.

SELECT chat_id, count(*) AS active_count
FROM public.telegram_subscriptions
WHERE is_active = true
GROUP BY chat_id
HAVING count(*) > 1;

-- Jika query di atas mengembalikan row, nonaktifkan/rapikan duplikasi dulu.
-- Setelah bersih, aktifkan unique partial index berikut.

CREATE UNIQUE INDEX IF NOT EXISTS telegram_subscriptions_active_chat_id_unique
ON public.telegram_subscriptions (chat_id)
WHERE is_active = true;
