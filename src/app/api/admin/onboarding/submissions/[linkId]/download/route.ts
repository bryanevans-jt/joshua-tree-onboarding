import { NextResponse } from 'next/server';
import { requireApprovedAdmin } from '@/lib/admin-api-auth';
import { buildApplicantZip } from '@/lib/onboarding-submissions';

interface RouteParams {
  params: { linkId: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  if (!(await requireApprovedAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const result = await buildApplicantZip(params.linkId);
    if (!result) {
      return NextResponse.json({ error: 'No files available for this applicant' }, { status: 404 });
    }
    const body = new Uint8Array(result.buffer.buffer, result.buffer.byteOffset, result.buffer.byteLength);
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.zipFilename}"`,
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
