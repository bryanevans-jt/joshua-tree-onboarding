import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSectionById, serializeSectionAdmin, updateSection } from '@/lib/training-store';
import { uploadTrainingSectionPdf, deleteTrainingPdf } from '@/lib/training-storage';

interface RouteParams {
  params: { id: string; sectionId: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const section = await getSectionById(params.sectionId);
  if (!section || section.moduleId !== params.id || section.kind !== 'pdf') {
    return NextResponse.json({ error: 'PDF section not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'PDF file required' }, { status: 400 });
  }
  const name = file.name || 'document.pdf';
  const buffer = Buffer.from(await file.arrayBuffer());
  let key: string;
  try {
    key = await uploadTrainingSectionPdf(params.id, params.sectionId, name, buffer);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    );
  }

  const updated = await updateSection(params.sectionId, {
    title: section.title,
    pdfKey: key,
    quiz: section.quiz,
    summary: section.summary ?? null,
    estimatedMinutes: section.estimatedMinutes ?? null,
  });

  return NextResponse.json({ section: serializeSectionAdmin(updated) });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const section = await getSectionById(params.sectionId);
  if (!section || section.moduleId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const key = section.pdfKey;
  const updated = await updateSection(params.sectionId, {
    title: section.title,
    pdfKey: null,
    quiz: section.quiz,
    summary: section.summary ?? null,
    estimatedMinutes: section.estimatedMinutes ?? null,
  });
  if (key) {
    try {
      await deleteTrainingPdf(key);
    } catch (e) {
      console.error('[training] delete pdf', e);
    }
  }
  return NextResponse.json({ section: serializeSectionAdmin(updated) });
}
