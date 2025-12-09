import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://spnttuopczrpmrdjwwbt.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbnR0dW9wY3pycG1yZGp3d2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTk3MjMsImV4cCI6MjA3Mzk3NTcyM30.rrwkTozEsqoNKMyM-8inkgZL8rN7XAeENYln0Cy01CY';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

// Default client using anon key (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Service role client (bypasses RLS) - for admin operations
export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper function to create a client with user's access token
export const createUserClient = (accessToken: string): SupabaseClient => {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  return client;
};
