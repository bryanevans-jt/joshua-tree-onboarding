import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isSuperadmin } from '@/lib/auth';
import { getApprovedAdmins, addApprovedAdmin, removeApprovedAdmin } from '@/lib/approved-admins';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperadmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const list = await getApprovedAdmins();
  return NextResponse.json({ approved: list });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperadmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const action = body.action as string;
  const email = (body.email as string)?.trim?.();
  if (action === 'add') {
    const result = await addApprovedAdmin(email);
    return NextResponse.json(result);
  }
  if (action === 'remove') {
    const result = await removeApprovedAdmin(email);
    return NextResponse.json(result);
  }
  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}
