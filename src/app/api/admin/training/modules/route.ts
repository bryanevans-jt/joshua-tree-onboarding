import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { createModule, listModules } from '@/lib/training-store';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const modules = await listModules();
  return NextResponse.json({ modules });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const name = (body.name as string | undefined)?.trim();
  const slug = (body.slug as string | undefined)?.trim();
  const description = (body.description as string | undefined)?.trim() || null;
  const isCompanyWide = !!body.isCompanyWide;
  const teamId = (body.teamId as string | undefined)?.trim() || null;
  const moduleSortOrder =
    body.moduleSortOrder !== undefined ? Math.floor(Number(body.moduleSortOrder)) : 0;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }
  if (!isCompanyWide && !teamId) {
    return NextResponse.json(
      { error: 'Team module requires teamId, or mark as company-wide.' },
      { status: 400 }
    );
  }

  try {
    const module = await createModule({
      name,
      slug,
      description,
      isCompanyWide,
      teamId: isCompanyWide ? null : teamId,
      moduleSortOrder: Number.isNaN(moduleSortOrder) ? 0 : moduleSortOrder,
    });
    return NextResponse.json({ module });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create module' },
      { status: 500 }
    );
  }
}
