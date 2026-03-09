import { NextResponse } from 'next/server';
import {
  saveTemplate,
  setTemplateFilename,
  positionToJobKey,
  SHARED_KEYS,
} from '@/lib/template-storage';
import { POSITIONS } from '@/lib/config';

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const VALID_KEYS = new Set<string>([
  ...SHARED_KEYS,
  ...POSITIONS.map((p) => positionToJobKey(p)),
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const key = (formData.get('key') as string)?.trim() || null;
    const position = (formData.get('position') as string)?.trim() || null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'No file or empty file' },
        { status: 400 }
      );
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 20 MB)' },
        { status: 400 }
      );
    }

    let templateKey: string;
    if (key === 'job_description' && position) {
      templateKey = positionToJobKey(position);
    } else if (key && (SHARED_KEYS as readonly string[]).includes(key)) {
      templateKey = key;
    } else {
      return NextResponse.json(
        { error: 'Invalid key or position' },
        { status: 400 }
      );
    }

    if (!VALID_KEYS.has(templateKey)) {
      return NextResponse.json(
        { error: 'Invalid key or position' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveTemplate(templateKey, buffer);
    await setTemplateFilename(templateKey, file.name);

    return NextResponse.json({ ok: true, key: templateKey });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
