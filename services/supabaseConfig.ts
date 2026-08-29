/**
 * ==============================================================================
 * Supabase Database Credentials & Configuration for Glory Valley School App
 * ==============================================================================
 * 
 * Paste your Supabase Project URL and Anon Public Key below (inside quotes '').
 * 
 * You can find these in your Supabase Dashboard:
 * 1. Go to: https://supabase.com/dashboard/project/ygnjrpmosqihoxlhmufy
 * 2. Click "Project Settings" (gear icon) -> "API" (or "API Keys")
 * 3. Copy "Project URL" and "anon / public" API key.
 */

// 1. Supabase Project URL
export const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://ygnjrpmosqihoxlhmufy.supabase.co';

// 2. Supabase Public Anon Key (paste your key between the single quotes below)
export const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'YOUR_SUPABASE_ANON_KEY_HERE';

// 3. Project Name
export const SUPABASE_PROJECT_NAME: string = 'Glory Valley School Management';
