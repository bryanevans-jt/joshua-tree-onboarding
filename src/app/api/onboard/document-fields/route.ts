import { NextResponse } from 'next/server';
import { getLinkByToken } from '@/lib/store';
import { readTemplate } from '@/lib/template-storage';
import { getPdfFormFields } from '@/lib/pdf';
import { positionToJobKey, FINGERPRINT_FORM_BY_STATE } from '@/lib/config';
import type { State } from '@/lib/config';

const STEP_TO_TEMPLATE: Record<string, (state: State, position: string) => string> = {
  job_description: (_state, position) => positionToJobKey(position),
  policy_manual: () => 'policy_manual',
  w4: () => 'w4',
  g4: () => 'g4',
  i9: () => 'i9',
  direct_deposit: () => 'direct_deposit',
  fingerprint: (state) => FINGERPRINT_FORM_BY_STATE[state],
  national_child_protection_act_consent: () => 'national_child_protection_act_consent',
  privacy_notice: () => 'privacy_notice',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const step = searchParams.get('step');
  if (!token || !step) {
    return NextResponse.json({ error: 'Missing token or step' }, { status: 400 });
  }
  const link = await getLinkByToken(token);
  if (!link) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  }
  const getKey = STEP_TO_TEMPLATE[step];
  if (!getKey) {
    return NextResponse.json({ error: 'Unknown step' }, { status: 400 });
  }
  const templateKey = getKey(link.state as State, link.position);
  const buf = await readTemplate(templateKey);
  if (!buf) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  const arrayBuf = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
  const fields = await getPdfFormFields(arrayBuf);
  return NextResponse.json({ fields });
}
