import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSettings } from '@/lib/store';
import { sendTrainingTestEmailTo } from '@/lib/training-completion-email';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const toOverride = (body.to as string | undefined)?.trim();
  const moduleName =
    (body.moduleName as string | undefined)?.trim() || 'Sample training module';
  const dryRun = body.dryRun === true;

  const appSettings = await getSettings().catch(() => null);
  const fromConfigured = !!(
    appSettings?.fromEmail ||
    appSettings?.hrDirectorEmail ||
    process.env.GMAIL_USER
  );
  const target =
    toOverride ||
    (session?.user?.email as string | undefined)?.trim() ||
    appSettings?.hrDirectorEmail?.trim();
  if (!target) {
    return NextResponse.json(
      {
        error:
          'No recipient. Pass "to", or configure Administration Director email in Settings, or sign in with a known email.',
      },
      { status: 400 }
    );
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      wouldSendTo: target,
      fromEmailConfigured: fromConfigured,
    });
  }

  try {
    await sendTrainingTestEmailTo({
      to: target,
      userName: 'Sample New Hire',
      userEmail: 'trainee@example.com',
      moduleName,
    });
    return NextResponse.json({
      ok: true,
      sentTo: target,
      usedDefaultRecipient: !toOverride,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}
