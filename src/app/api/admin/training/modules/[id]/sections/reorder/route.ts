import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { reorderSections } from '@/lib/training-store';

interface RouteParams {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const orderedSectionIds = body.orderedSectionIds as string[] | undefined;
  if (!Array.isArray(orderedSectionIds) || orderedSectionIds.length === 0) {
    return NextResponse.json({ error: 'orderedSectionIds required' }, { status: 400 });
  }
  try {
    await reorderSections(params.id, orderedSectionIds);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Reorder failed' },
      { status: 400 }
    );
  }
}
