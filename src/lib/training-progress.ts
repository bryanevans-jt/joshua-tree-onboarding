import { getSupabase } from './supabase-server';
import { gradeQuiz } from './training-quiz';
import type { TrainingModule, TrainingSection } from './training-types';
import {
  getRosterRow,
  getTeamModuleForTeam,
  listCompanyWideModules,
  listSectionsForModule,
} from './training-store';

export interface SectionProgressRow {
  userId: string;
  sectionId: string;
  contentVersion: number;
  videoCompletedAt: string | null;
  quizPassedAt: string | null;
  quizAttempts: number;
}

function rowProg(r: any): SectionProgressRow {
  return {
    userId: r.user_id,
    sectionId: r.section_id,
    contentVersion: r.content_version ?? 1,
    videoCompletedAt: r.video_completed_at ?? null,
    quizPassedAt: r.quiz_passed_at ?? null,
    quizAttempts: r.quiz_attempts ?? 0,
  };
}

export async function getSectionProgress(
  userId: string,
  sectionId: string
): Promise<SectionProgressRow | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('training_section_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('section_id', sectionId)
    .maybeSingle();
  return data ? rowProg(data) : null;
}

export function isSectionSatisfied(section: TrainingSection, p: SectionProgressRow | null): boolean {
  if (!p || p.contentVersion !== section.contentVersion) return false;
  const hasQuiz = !!(section.quiz && section.quiz.questions.length);
  if (section.kind === 'video') {
    if (!p.videoCompletedAt) return false;
    if (hasQuiz) return !!p.quizPassedAt;
    return true;
  }
  if (section.kind === 'pdf') {
    if (hasQuiz) return !!p.quizPassedAt;
    return !!section.pdfKey;
  }
  return false;
}

export async function isCompanyWideProgramComplete(userId: string): Promise<boolean> {
  const modules = await listCompanyWideModules();
  for (const m of modules) {
    const sections = await listSectionsForModule(m.id);
    for (const s of sections) {
      const p = await getSectionProgress(userId, s.id);
      if (!isSectionSatisfied(s, p)) return false;
    }
  }
  return true;
}

export async function isTeamModuleCompleteForUser(
  userId: string,
  userEmail: string
): Promise<boolean> {
  const roster = await getRosterRow(userEmail);
  if (!roster) return false;
  const teamMod = await getTeamModuleForTeam(roster.teamId);
  if (!teamMod) return true;
  const sections = await listSectionsForModule(teamMod.id);
  if (sections.length === 0) return true;
  for (const s of sections) {
    const p = await getSectionProgress(userId, s.id);
    if (!isSectionSatisfied(s, p)) return false;
  }
  return true;
}

export async function recordVideoSectionWatched(opts: {
  userId: string;
  section: TrainingSection;
  contentVersion: number;
}): Promise<void> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const existing = await getSectionProgress(opts.userId, opts.section.id);
  const { error } = await supabase.from('training_section_progress').upsert(
    {
      user_id: opts.userId,
      section_id: opts.section.id,
      content_version: opts.contentVersion,
      video_completed_at: now,
      quiz_passed_at: existing?.quizPassedAt ?? null,
      quiz_attempts: existing?.quizAttempts ?? 0,
      updated_at: now,
    },
    { onConflict: 'user_id,section_id' }
  );
  if (error) throw new Error(error.message);
}

export async function recordQuizSubmit(opts: {
  userId: string;
  section: TrainingSection;
  answers: Record<string, number | undefined>;
}): Promise<{
  allCorrect: boolean;
  wrongQuestionIds: string[];
  quizAttempts: number;
  quizPassedAt: string | null;
}> {
  const quiz = opts.section.quiz;
  if (!quiz || !quiz.questions.length) {
    throw new Error('This section has no quiz.');
  }
  const { allCorrect, wrongQuestionIds } = gradeQuiz(quiz, opts.answers);
  const supabase = getSupabase();
  const existing = await getSectionProgress(opts.userId, opts.section.id);
  const now = new Date().toISOString();
  const baseAttempts = existing?.quizAttempts ?? 0;
  const version = opts.section.contentVersion;
  const nextAttempts = baseAttempts + 1;
  const videoAt = existing?.videoCompletedAt ?? null;

  if (!existing) {
    const { error } = await supabase.from('training_section_progress').insert({
      user_id: opts.userId,
      section_id: opts.section.id,
      content_version: version,
      video_completed_at: videoAt,
      quiz_attempts: nextAttempts,
      quiz_passed_at: allCorrect ? now : null,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('training_section_progress')
      .update({
        content_version: version,
        video_completed_at: videoAt,
        quiz_attempts: nextAttempts,
        quiz_passed_at: allCorrect ? now : existing.quizPassedAt,
        updated_at: now,
      })
      .eq('user_id', opts.userId)
      .eq('section_id', opts.section.id);
    if (error) throw new Error(error.message);
  }

  const after = await getSectionProgress(opts.userId, opts.section.id);
  return {
    allCorrect,
    wrongQuestionIds,
    quizAttempts: after?.quizAttempts ?? nextAttempts,
    quizPassedAt: after?.quizPassedAt ?? null,
  };
}

export interface QuizAttemptSummaryLine {
  moduleName: string;
  sectionTitle: string;
  attemptsToPass: number;
}

export async function buildQuizAttemptSummaryForUser(
  userId: string,
  userEmail: string
): Promise<QuizAttemptSummaryLine[]> {
  const lines: QuizAttemptSummaryLine[] = [];
  const roster = await getRosterRow(userEmail);
  const modules: TrainingModule[] = [...(await listCompanyWideModules())];
  if (roster) {
    const tm = await getTeamModuleForTeam(roster.teamId);
    if (tm) modules.push(tm);
  }
  for (const m of modules) {
    const sections = await listSectionsForModule(m.id);
    for (const s of sections) {
      if (!s.quiz || !s.quiz.questions.length) continue;
      const p = await getSectionProgress(userId, s.id);
      if (!p?.quizPassedAt) continue;
      lines.push({
        moduleName: m.name,
        sectionTitle: s.title,
        attemptsToPass: p.quizAttempts,
      });
    }
  }
  return lines;
}

export async function hasFullCompletionEmailBeenSent(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('training_full_completion')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function markFullCompletionEmailSent(userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('training_full_completion').upsert(
    { user_id: userId, sent_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

export async function deleteAllProgressForUser(userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('training_section_progress').delete().eq('user_id', userId);
  await supabase.from('training_full_completion').delete().eq('user_id', userId);
}

export async function deleteProgressForModule(moduleId: string): Promise<void> {
  const supabase = getSupabase();
  const sections = await listSectionsForModule(moduleId);
  for (const s of sections) {
    await supabase.from('training_section_progress').delete().eq('section_id', s.id);
  }
}
