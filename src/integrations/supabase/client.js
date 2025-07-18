import { createClient } from '@supabase/supabase-js';

// Detecta variáveis de ambiente públicas (Vite ou Next.js) para frontend
const SUPABASE_URL =
  typeof window !== 'undefined'
    ? (import.meta?.env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  typeof window !== 'undefined'
    ? (import.meta?.env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : process.env.SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 
