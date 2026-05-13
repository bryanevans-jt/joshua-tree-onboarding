import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import {
  createSection,
  deleteModule,
  getModuleById,
  listSectionsForModule,
  serializeSectionAdmin,
  updateModule,
} from '@/lib/training-store';

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const mod = await getModuleById(params.id);
  if (!mod) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const sections = await listSectionsForModule(mod.id);
  return NextResponse.json({
    module: {
      ...mod,
      sections: sections.map(serializeSectionAdmin),
    },
  });
}

export async function POST(request: Request, { params }: RouteParams) {
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
    const module = await updateModule(params.id, {
      name,
      slug,
      description,
      isCompanyWide,
      teamId: isCompanyWide ? null : teamId,
      moduleSortOrder: Number.isNaN(moduleSortOrder) ? 0 : moduleSortOrder,
    });
    const sections = await listSectionsForModule(module.id);
    return NextResponse.json({
      module: {
        ...module,
        sections: sections.map(serializeSectionAdmin),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update module' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await deleteModule(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete' },
      { status: 500 }
    );
  }
}
