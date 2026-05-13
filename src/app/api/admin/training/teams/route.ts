import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { adminListAllTeams, adminUpsertTeam } from '@/lib/training-store';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const teams = await adminListAllTeams();
  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  try {
    const team = await adminUpsertTeam({
      id: body.id as string | undefined,
      slug: (body.slug as string) || '',
      label: (body.label as string) || '',
      sortOrder: Math.floor(Number(body.sortOrder ?? 0)),
      active: body.active !== false,
    });
    return NextResponse.json({ team });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}
