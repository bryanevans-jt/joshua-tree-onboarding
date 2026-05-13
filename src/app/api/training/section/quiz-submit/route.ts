import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getModuleById, getSectionById } from '@/lib/training-store';
import { assertTeamSectionMutationAllowed } from '@/lib/training-gating';
import { getSectionProgress, recordQuizSubmit } from '@/lib/training-progress';
import { trySendFullProgramCompletionIfReady } from '@/lib/training-completion-email';
import { canUserAccessTrainingModule } from '@/lib/training-trainee-access';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const email = user?.email ?? null;
  const userId = (user as { email?: string })?.email || '';
  const userName = user?.name || 'Team member';
  if (!email || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const sectionId = (body.sectionId as string | undefined)?.trim();
  const answers = (body.answers as Record<string, number | undefined>) || {};
  if (!sectionId) {
    return NextResponse.json({ error: 'sectionId required' }, { status: 400 });
  }

  const section = await getSectionById(sectionId);
  if (!section) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const mod = await getModuleById(section.moduleId);
  if (!mod || !(await canUserAccessTrainingModule(email, mod))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await assertTeamSectionMutationAllowed(userId, section.moduleId);
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Forbidden' },
      { status: code === 403 ? 403 : 400 }
    );
  }

  if (section.kind === 'video' && section.quiz && section.quiz.questions.length) {
    const prog = await getSectionProgress(userId, section.id);
    if (!prog?.videoCompletedAt || prog.contentVersion !== section.contentVersion) {
      return NextResponse.json(
        { error: 'Watch at least 90% of the video before submitting the quiz.' },
        { status: 400 }
      );
    }
  }

  try {
    const result = await recordQuizSubmit({ userId, section, answers });
    await trySendFullProgramCompletionIfReady({ userId, userName, userEmail: email });
    return NextResponse.json({
      ok: true,
      allCorrect: result.allCorrect,
      wrongQuestionIds: result.wrongQuestionIds,
      quizAttempts: result.quizAttempts,
      quizPassedAt: result.quizPassedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 400 }
    );
  }
}
