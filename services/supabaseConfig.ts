/**
 * ==============================================================================
 * Supabase Database Credentials & Configuration for Glory Valley School App
 * ==============================================================================
 */

// 1. Supabase Project URL
export const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://ygnjrpmosqihoxlhmufy.supabase.co';

// 2. Supabase Public Anon Key
export const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbmpycG1vc3FpaG94bGhtdWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NTk3NjksImV4cCI6MjEwMzUzNTc2OX0.a6usOz5D1LONChdukniXptpeNQ7RNx-9Khv3AbnVg5M';

// 3. Project Name
export const SUPABASE_PROJECT_NAME: string = 'Glory Valley School Management';
