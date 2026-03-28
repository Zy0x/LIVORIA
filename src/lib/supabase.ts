import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://repgwikkyqlhpxfsecor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcGd3aWtreXFsaHB4ZnNlY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODAyNzQsImV4cCI6MjA4NTk1NjI3NH0.3wQZjHYrxmHAkSwXHwxSMSaq8lnqGVYrafIcp9rQ1ig';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'livoria-auth',
  },
});
