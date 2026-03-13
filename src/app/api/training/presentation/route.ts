import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { listVideosForModule } from '@/lib/training-store';
import { downloadTrainingPdf } from '@/lib/training-storage';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moduleId = url.searchParams.get('moduleId') ?? '';
  const videoId = url.searchParams.get('videoId') ?? '';

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!moduleId || !videoId) {
    return NextResponse.json(
      { error: 'moduleId and videoId are required' },
      { status: 400 }
    );
  }

  const videos = await listVideosForModule(moduleId);
  const video = videos.find((v) => v.id === videoId);
  if (!video || !video.presentationPdfKey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buf = await downloadTrainingPdf(video.presentationPdfKey);
  if (!buf) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const filename = `${video.title.replace(/[^\w]+/g, '_') || 'Presentation'}.pdf`;
  const body = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

