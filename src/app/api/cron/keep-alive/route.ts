/**
 * Minimal keep-alive for Supabase: one cheap query every ~6 days so the project
 * doesn’t get paused for inactivity. Vercel Cron sends CRON_SECRET in the
 * Authorization header; set CRON_SECRET in Vercel env vars.
 */

import { NextResponse } from 'next/server';
import { hasSupabase, getSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const tokenFromHeader = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get('secret')?.trim() ?? null;
  const token = tokenFromHeader ?? tokenFromQuery;
  if (secret && token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasSupabase()) {
    return NextResponse.json({ ok: true, message: 'No Supabase' });
  }

  try {
    const supabase = getSupabase();
    await supabase.from('app_settings').select('id').limit(1).single();
  } catch {
    // Ignore; we only need to hit the project
  }

  return NextResponse.json({ ok: true });
}
