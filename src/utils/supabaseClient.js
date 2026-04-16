// src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ✅ Используем те же значения, что и в App.jsx
const SUPABASE_URL = 'https://lcfooydickfghjlqpivw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZm9veWRpY2tmZ2hqbHFwaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjIwMjcsImV4cCI6MjA5MTkzODAyN30.f6TqW2G_nbUeD_wmUc0wJLRiSIw9m95Iwv-BR-FbSb4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  },
  db: {
    schema: 'public'
  }
});

// Экспорт хелпера для хеширования (используется в apiKeys.js)
export const hashKey = async (key) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default supabase;