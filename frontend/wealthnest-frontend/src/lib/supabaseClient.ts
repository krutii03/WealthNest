import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY as string;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_KEY (anon) is required');
}

// Custom storage adapter that uses sessionStorage instead of localStorage
// This means sessions will be cleared when the browser tab/window is closed
const sessionStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  },
};

// Create the Supabase client with sessionStorage (clears on browser close)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: sessionStorageAdapter, // Use sessionStorage instead of localStorage
  },
});

export { supabase };