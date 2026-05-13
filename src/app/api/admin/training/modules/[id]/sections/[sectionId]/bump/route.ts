import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { bumpSectionContentVersion, getSectionById, serializeSectionAdmin } from '@/lib/training-store';

interface RouteParams {
  params: { id: string; sectionId: string };
}

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await getSectionById(params.sectionId);
  if (!existing || existing.moduleId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const section = await bumpSectionContentVersion(params.sectionId);
    return NextResponse.json({ section: serializeSectionAdmin(section) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bump failed' },
      { status: 500 }
    );
  }
}
