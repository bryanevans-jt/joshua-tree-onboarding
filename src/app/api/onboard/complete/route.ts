import { NextResponse } from 'next/server';
import { getLinkByToken, updateLink, getSettings, saveProgress } from '@/lib/store';
import { buildAttachmentsFromUploads, splitAttachmentsForDelivery } from '@/lib/build-attachments-from-uploads';
import { deleteAllDocumentsForLink } from '@/lib/onboarding-upload-storage';
import { sendEmail } from '@/lib/email';

const REQUIRED_STEPS_GA = [
  'job_description', 'policy_manual', 'w4', 'g4', 'i9', 'direct_deposit',
  'fingerprint', 'privacy_notice', 'drivers_license', 'ssn_or_birth', 'headshot',
] as const;
const REQUIRED_STEPS_TN = [
  'job_description', 'policy_manual', 'w4', 'g4', 'i9', 'direct_deposit',
  'privacy_notice', 'drivers_license', 'ssn_or_birth', 'headshot',
] as const; // fingerprint optional for Tennessee

function getRequiredSteps(state: string): readonly string[] {
  return state === 'Tennessee' ? REQUIRED_STEPS_TN : REQUIRED_STEPS_GA;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newHireName } = body;
    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    const link = await getLinkByToken(token);
    if (!link) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 404 }
      );
    }

    await updateLink(token, {
      completedAt: new Date().toISOString(),
      newHireName: newHireName || undefined,
    });

    const progress = link.progress;
    const uploadedKeys = progress?.uploadedDocumentKeys ?? {};
    const required = getRequiredSteps(link.state);
    const missing = required.filter((step) => !uploadedKeys[step]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Please upload all required documents before submitting.' },
        { status: 400 }
      );
    }

    let settings: Awaited<ReturnType<typeof getSettings>>;
    try {
      settings = await getSettings();
    } catch (settingsErr) {
      console.error('[onboard/complete] getSettings failed:', settingsErr);
      return NextResponse.json(
        { error: 'Server configuration error. Please contact HR.' },
        { status: 500 }
      );
    }

    const subject = `Onboarding: ${newHireName || 'New hire'} – ${link.position} – ${link.state}`;
    const fromEmail =
      settings.fromEmail ||
      settings.hrDirectorEmail ||
      process.env.GMAIL_USER ||
      '';

    let attachments: Awaited<ReturnType<typeof buildAttachmentsFromUploads>>;
    try {
      attachments = await buildAttachmentsFromUploads(link.id, uploadedKeys, newHireName || undefined);
    } catch (buildErr) {
      console.error('[onboard/complete] buildAttachmentsFromUploads failed:', buildErr);
      return NextResponse.json(
        { error: 'Failed to prepare documents. Please try again.' },
        { status: 500 }
      );
    }

    const { hr, headshot } = splitAttachmentsForDelivery(attachments);

    const fingerprintMissing =
      link.state === 'Tennessee' && !uploadedKeys['fingerprint'];
    let hrBody = `Onboarding documents for ${newHireName || 'New hire'}, ${link.position}, ${link.state}. Please find attached.`;
    if (fingerprintMissing) {
      hrBody += '\n\nNote: Background Check Results were not submitted.';
    }

    if (settings.hrDirectorEmail && hr.length > 0) {
      const result = await sendEmail(
        {
          to: settings.hrDirectorEmail,
          subject,
          body: hrBody,
          attachments: hr,
        },
        fromEmail
      );
      if (!result.sent && result.error) {
        console.error('[onboard/complete] HR email failed:', result.error);
      }
    }

    if (settings.communicationsDirectorEmail && headshot) {
      const result = await sendEmail(
        {
          to: settings.communicationsDirectorEmail,
          subject,
          body: `Headshot for ${newHireName || 'New hire'}, ${link.position}, ${link.state}.`,
          attachments: [headshot],
        },
        fromEmail
      );
      if (!result.sent && result.error) {
        console.error('[onboard/complete] Comms email failed:', result.error);
      }
    }

    try {
      await deleteAllDocumentsForLink(link.id);
      await saveProgress(token, { uploadedDocumentKeys: {} });
    } catch (delErr) {
      console.error('[onboard/complete] delete/clear after send failed:', delErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[onboard/complete]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
