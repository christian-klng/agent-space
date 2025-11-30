import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  // In Vite/some browser envs, might be import.meta.env, but sticking to process check for safety
  return undefined;
};

// Access environment variables safely
const envUrl = getEnv('SUPABASE_URL');
const envKey = getEnv('SUPABASE_ANON_KEY');

// Use environment variables or fallback to a placeholder
// This allows the app to run immediately with the demo database if no env vars are set
const supabaseUrl = envUrl || 'https://rgorcjwvvclfpdvltzbz.supabase.co';
const supabaseAnonKey = envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnb3Jjand2dmNsZnBkdmx0emJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEyODksImV4cCI6MjA4MDA5NzI4OX0.hYAvZ9FtebPWp0iXFAk4tZKHy-oEQRavirS6oBFTDso';

// Check if configured - now returns true if fallbacks are present
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);