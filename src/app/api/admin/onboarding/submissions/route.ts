import { NextResponse } from 'next/server';
import { requireApprovedAdmin } from '@/lib/admin-api-auth';
import { listApplicantSubmissions } from '@/lib/onboarding-submissions';

export async function GET() {
  if (!(await requireApprovedAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const submissions = await listApplicantSubmissions();
    return NextResponse.json({ submissions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list submissions' },
      { status: 500 }
    );
  }
}
