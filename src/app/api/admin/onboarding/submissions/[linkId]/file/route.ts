import { NextResponse } from 'next/server';
import { requireApprovedAdmin } from '@/lib/admin-api-auth';
import { downloadApplicantFile } from '@/lib/onboarding-submissions';

interface RouteParams {
  params: { linkId: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  if (!(await requireApprovedAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const stepId = new URL(request.url).searchParams.get('stepId')?.trim();
  if (!stepId) {
    return NextResponse.json({ error: 'stepId required' }, { status: 400 });
  }
  try {
    const file = await downloadApplicantFile(params.linkId, stepId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const body = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Download failed' },
      { status: 500 }
    );
  }
}
