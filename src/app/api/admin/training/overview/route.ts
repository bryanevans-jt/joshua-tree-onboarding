import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { buildAdminTrainingOverview } from '@/lib/training-admin-overview';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const data = await buildAdminTrainingOverview();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to build overview' },
      { status: 500 }
    );
  }
}
