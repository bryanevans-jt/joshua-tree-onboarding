/**
 * Cron: delete onboarding upload files older than 30 days to stay within free tier.
 * Call with same auth as keep-alive (CRON_SECRET). Add to Vercel Cron or external cron.
 */

import { NextResponse } from 'next/server';
import { cleanupOldUploads } from '@/lib/onboarding-upload-storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_DAYS = 30;

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

  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') ?? String(DEFAULT_DAYS), 10) || DEFAULT_DAYS));

  try {
    const { deleted } = await cleanupOldUploads(days);
    return NextResponse.json({ ok: true, deleted, days });
  } catch (e) {
    console.error('[cron/cleanup-uploads]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}
