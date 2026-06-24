// Copiez ce fichier en js/config.js puis renseignez vos identifiants Supabase.
//
// Dashboard Supabase → Project Settings → API
//   • Project URL  → SUPABASE_URL
//   • anon public  → SUPABASE_ANON_KEY

export const SUPABASE_URL = 'https://VOTRE-ID.supabase.co';
export const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON';

export const isConfigured = () =>
  SUPABASE_URL !== 'https://VOTRE-ID.supabase.co' &&
  SUPABASE_ANON_KEY !== 'VOTRE_CLE_ANON';
