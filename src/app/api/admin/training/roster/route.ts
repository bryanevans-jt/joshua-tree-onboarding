import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { deleteRosterRow, listRoster, upsertRosterRow } from '@/lib/training-store';
import type { TrainingRosterRow } from '@/lib/training-types';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const roster = await listRoster();
  return NextResponse.json({ roster });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const row: TrainingRosterRow = {
    email: (body.email as string) || '',
    teamId: (body.teamId as string) || '',
    supervisorEmail: (body.supervisorEmail as string) || '',
    displayName: (body.displayName as string | undefined)?.trim() || null,
  };
  if (!row.email || !row.teamId || !row.supervisorEmail) {
    return NextResponse.json({ error: 'email, teamId, supervisorEmail required' }, { status: 400 });
  }
  try {
    await upsertRosterRow(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const url = new URL(request.url);
  const em = url.searchParams.get('email')?.trim();
  if (!em) return NextResponse.json({ error: 'email query required' }, { status: 400 });
  await deleteRosterRow(em);
  return NextResponse.json({ ok: true });
}
