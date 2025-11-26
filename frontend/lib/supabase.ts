import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ SUPABASE ENV VARIABLES MISSING! Lütfen .env.local dosyasını kontrol edin.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
