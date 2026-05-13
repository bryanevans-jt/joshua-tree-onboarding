import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { buildSupervisorTrainingOverview } from '@/lib/training-admin-overview';
import { isTaggedSupervisor } from '@/lib/training-store';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isTaggedSupervisor(email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const data = await buildSupervisorTrainingOverview(email);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
