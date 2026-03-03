import { NextResponse } from 'next/server';
import { getProgress, saveProgress } from '@/lib/store';
import type { OnboardingProgressData } from '@/lib/types';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }
  const progress = await getProgress(token);
  return NextResponse.json(progress ?? {});
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { token, ...progress } = body as { token: string } & Partial<OnboardingProgressData>;
    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }
    await saveProgress(token, progress);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
