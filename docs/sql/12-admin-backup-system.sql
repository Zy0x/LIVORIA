-- 1. Create backups table for 7-day rotation
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but restrict to service role only (no policies for users)
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- 2. Create RPC for dynamic table discovery
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE (table_name text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
END;
$$;
