import { NextResponse } from 'next/server';
import { listUploadedTemplates } from '@/lib/template-storage';
import { POSITIONS } from '@/lib/config';

export async function GET() {
  try {
    const positions = [...POSITIONS];
    const uploaded = await listUploadedTemplates(positions);
    return NextResponse.json({ uploaded });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
