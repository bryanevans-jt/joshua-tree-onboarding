import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSectionById, getModuleById } from '@/lib/training-store';
import { downloadTrainingPdf } from '@/lib/training-storage';
import { canUserAccessTrainingModule } from '@/lib/training-trainee-access';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const sectionId = url.searchParams.get('sectionId')?.trim();
  if (!sectionId) {
    return NextResponse.json({ error: 'sectionId required' }, { status: 400 });
  }
  const section = await getSectionById(sectionId);
  if (!section || section.kind !== 'pdf' || !section.pdfKey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const mod = await getModuleById(section.moduleId);
  if (!mod || !(await canUserAccessTrainingModule(email, mod))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const buf = await downloadTrainingPdf(section.pdfKey);
  if (!buf) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  const filename = `${section.title.replace(/[^\w]+/g, '_') || 'document'}.pdf`;
  const body = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=120',
    },
  });
}
