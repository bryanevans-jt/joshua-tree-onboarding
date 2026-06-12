import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import {
  deleteSection,
  getSectionById,
  serializeSectionAdmin,
  updateSection,
} from '@/lib/training-store';
import { parseQuizJson } from '@/lib/training-quiz';

interface RouteParams {
  params: { id: string; sectionId: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

  const body = await request.json();
  const title = (body.title as string | undefined)?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  const youtubeUrl =
    existing.kind === 'video'
      ? (body.youtubeUrl as string | undefined)?.trim() || null
      : null;
  const pdfKey =
    existing.kind === 'pdf' ? (body.pdfKey as string | undefined) ?? existing.pdfKey : null;
  let quiz = existing.quiz;
  if (body.quiz !== undefined) {
    const parsed = parseQuizJson(body.quiz);
    if (
      body.quiz &&
      typeof body.quiz === 'object' &&
      Array.isArray((body.quiz as { questions?: unknown }).questions) &&
      (body.quiz as { questions: unknown[] }).questions.length > 0 &&
      !parsed
    ) {
      return NextResponse.json({ error: 'Invalid quiz: check prompts, choices, and correct answers.' }, { status: 400 });
    }
    quiz = parsed;
  }

  try {
    const section = await updateSection(params.sectionId, {
      title,
      youtubeUrl,
      pdfKey,
      quiz,
      summary: (body.summary as string | undefined)?.trim() || null,
      estimatedMinutes:
        body.estimatedMinutes !== undefined && body.estimatedMinutes !== null
          ? Math.max(0, Math.floor(Number(body.estimatedMinutes)))
          : null,
      isOptional:
        body.isOptional !== undefined ? Boolean(body.isOptional) : existing.isOptional,
    });
    return NextResponse.json({ section: serializeSectionAdmin(section) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Update failed' },
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

  const existing = await getSectionById(params.sectionId);
  if (!existing || existing.moduleId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await deleteSection(params.sectionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
