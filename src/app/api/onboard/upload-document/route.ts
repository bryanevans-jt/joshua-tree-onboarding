import { NextResponse } from 'next/server';
import { getLinkByToken, saveProgress } from '@/lib/store';
import { uploadDocument, ensureBucket } from '@/lib/onboarding-upload-storage';

const ALLOWED_STEPS = new Set([
  'job_description',
  'policy_manual',
  'w4',
  'g4',
  'i9',
  'direct_deposit',
  'fingerprint',
  'national_child_protection_act_consent',
  'privacy_notice',
  'drivers_license',
  'ssn_or_birth',
  'headshot',
]);

/** Headshot: JPG and PNG only. All other uploads: PDF, JPG, PNG. */
const HEADSHOT_ACCEPT = new Set(['image/jpeg', 'image/png']);
const DOCUMENT_ACCEPT = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function isAcceptedFile(stepId: string, mime: string, name: string): { ok: boolean; allowed: string } {
  const nameStr = (name || '').toLowerCase();
  if (stepId === 'headshot') {
    const extOk = /\.(jpe?g|png)$/.test(nameStr);
    const mimeOk = HEADSHOT_ACCEPT.has(mime);
    if ((extOk || mimeOk) && !/\.pdf$/.test(nameStr)) return { ok: true, allowed: '' };
    return { ok: false, allowed: 'JPG or PNG' };
  }
  const extOk = /\.(pdf|jpe?g|png)$/.test(nameStr);
  const mimeOk = DOCUMENT_ACCEPT.has(mime);
  if (extOk || mimeOk) return { ok: true, allowed: '' };
  return { ok: false, allowed: 'PDF, JPG, or PNG' };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = (formData.get('token') as string)?.trim();
    const stepId = (formData.get('stepId') as string)?.trim();
    const file = formData.get('file') as File | null;
    if (!token || !stepId || !file) {
      return NextResponse.json(
        { error: 'Missing token, stepId, or file' },
        { status: 400 }
      );
    }
    if (!ALLOWED_STEPS.has(stepId)) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    const { ok, allowed } = isAcceptedFile(stepId, file.type || '', file.name || '');
    if (!ok) {
      const label = stepId === 'headshot' ? 'Headshot photo' : 'This document';
      return NextResponse.json(
        { error: `${label} accepts only ${allowed} files. Please choose an accepted file type.` },
        { status: 400 }
      );
    }

    const link = await getLinkByToken(token);
    if (!link) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'application/octet-stream';

    await ensureBucket();
    const key = await uploadDocument(link.id, stepId, buffer, mimeType);

    await saveProgress(token, {
      uploadedDocumentKeys: { [stepId]: key },
    });

    return NextResponse.json({ ok: true, key });
  } catch (e) {
    console.error('[onboard/upload-document]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
