import { NextResponse } from 'next/server';
import { getLinkByToken, updateLink, getSettings } from '@/lib/store';
import { buildHrAttachments, getHeadshotAttachment } from '@/lib/build-onboarding-pdfs';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newHireName, state, position, signatures, uploads, formData } = body;
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

    const settings = await getSettings();
    const subject = `Onboarding: ${newHireName || 'New hire'} – ${position} – ${state}`;
    const fromEmail =
      settings.fromEmail ||
      settings.hrDirectorEmail ||
      process.env.GMAIL_USER ||
      '';

    const hrAttachments = await buildHrAttachments({
      state,
      position,
      signatures: signatures ?? {},
      uploads: uploads ?? {},
      formData: formData ?? undefined,
    });

    if (settings.hrDirectorEmail && hrAttachments.length > 0) {
      const result = await sendEmail(
        {
          to: settings.hrDirectorEmail,
          subject,
          body: `Onboarding documents for ${newHireName || 'New hire'}, ${position}, ${state}. Please find attached individual PDFs.`,
          attachments: hrAttachments,
        },
        fromEmail
      );
      if (!result.sent && result.error) {
        console.error('[onboard/complete] HR email failed:', result.error);
      }
    }

    const headshot = getHeadshotAttachment(uploads ?? {});
    if (settings.communicationsDirectorEmail && headshot) {
      const result = await sendEmail(
        {
          to: settings.communicationsDirectorEmail,
          subject,
          body: `Headshot for ${newHireName || 'New hire'}, ${position}, ${state}.`,
          attachments: [headshot],
        },
        fromEmail
      );
      if (!result.sent && result.error) {
        console.error('[onboard/complete] Comms email failed:', result.error);
      }
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
