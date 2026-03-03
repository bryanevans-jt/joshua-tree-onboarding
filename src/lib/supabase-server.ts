/**
 * Supabase client for server-side only (API routes, server components).
 * Uses service role key so we can read/write links, settings, and storage.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabase() {
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey);
}

export function hasSupabase(): boolean {
  return !!(url && serviceKey);
}
