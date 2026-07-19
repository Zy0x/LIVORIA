-- Migration to add main_url column to anime and donghua tables
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS main_url TEXT DEFAULT '';
ALTER TABLE public.donghua ADD COLUMN IF NOT EXISTS main_url TEXT DEFAULT '';
