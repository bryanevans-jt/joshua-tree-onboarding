import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import {
  addTaggedSupervisor,
  listTaggedSupervisors,
  removeTaggedSupervisor,
} from '@/lib/training-store';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const emails = await listTaggedSupervisors();
  return NextResponse.json({ emails });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const sup = (body.email as string | undefined)?.trim();
  if (!sup) return NextResponse.json({ error: 'email required' }, { status: 400 });
  try {
    await addTaggedSupervisor(sup);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
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
  await removeTaggedSupervisor(em);
  return NextResponse.json({ ok: true });
}
