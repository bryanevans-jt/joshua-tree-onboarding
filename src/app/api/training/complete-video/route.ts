import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabase } from '@/lib/supabase-server';
import { listVideosForModule, getTrainingSettings } from '@/lib/training-store';
import {
  getUserModuleCompletions,
  isModuleCompleteForUser,
  recordVideoCompletion,
} from '@/lib/training-progress';
import { sendEmail } from '@/lib/email';
import { getSettings } from '@/lib/store';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const email = user?.email ?? null;
  const userId = (user as any)?.id || user?.email || '';
  const userName = user?.name || 'New hire';

  if (!email || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const moduleId = (body.moduleId as string | undefined)?.trim();
  const videoId = (body.videoId as string | undefined)?.trim();

  if (!moduleId || !videoId) {
    return NextResponse.json(
      { error: 'moduleId and videoId are required' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const videos = await listVideosForModule(moduleId);
  const video = videos.find((v) => v.id === videoId);
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  try {
    await recordVideoCompletion({
      userId,
      userEmail: email,
      userName,
      moduleId,
      video,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to record completion' },
      { status: 500 }
    );
  }

  const completions = await getUserModuleCompletions(userId, moduleId);
  const nowComplete = isModuleCompleteForUser(videos, completions);

  if (nowComplete) {
    // Send completion emails (per module).
    try {
      const [trainingSettings, appSettings] = await Promise.all([
        getTrainingSettings(),
        getSettings().catch(() => null),
      ]);

      const moduleRow = await supabase
        .from('training_modules')
        .select('*')
        .eq('id', moduleId)
        .maybeSingle();

      const moduleName = moduleRow.data?.name || 'Training module';

      const subject = `Training complete: ${userName} – ${moduleName}`;
      const fromEmail =
        appSettings?.fromEmail ||
        appSettings?.hrDirectorEmail ||
        process.env.GMAIL_USER ||
        '';

      const recipientsSet = new Set<string>();
      (trainingSettings.notificationEmails || []).forEach((r) =>
        recipientsSet.add(r)
      );
      if (appSettings?.hrDirectorEmail) recipientsSet.add(appSettings.hrDirectorEmail);

      const bodyText = `Training videos complete for ${userName} (${email}) in module "${moduleName}".`;
      const recipients = Array.from(recipientsSet);

      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        const result = await sendEmail(
          {
            to,
            subject,
            body: bodyText,
          },
          fromEmail
        );
        if (!result.sent && result.error) {
          console.error('[training/complete-video] email failed:', result.error);
        }
      }
    } catch (e) {
      console.error('[training/complete-video] email block failed:', e);
    }
  }

  return NextResponse.json({ ok: true, moduleComplete: nowComplete });
}

