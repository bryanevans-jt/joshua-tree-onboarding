import { sendEmail } from '@/lib/email';
import { getSettings } from '@/lib/store';
import {
  buildQuizAttemptSummaryForUser,
  hasFullCompletionEmailBeenSent,
  isCompanyWideProgramComplete,
  isTeamModuleCompleteForUser,
  markFullCompletionEmailSent,
} from '@/lib/training-progress';

function uniqueEmails(emails: string[]) {
  const s = new Set<string>();
  for (const e of emails) {
    const x = e.trim().toLowerCase();
    if (x) s.add(x);
  }
  return Array.from(s);
}

export async function trySendFullProgramCompletionIfReady(opts: {
  userId: string;
  userName: string;
  userEmail: string;
}): Promise<{ sent: boolean }> {
  if (await hasFullCompletionEmailBeenSent(opts.userId)) {
    return { sent: false };
  }
  if (!(await isCompanyWideProgramComplete(opts.userId))) {
    return { sent: false };
  }
  if (!(await isTeamModuleCompleteForUser(opts.userId, opts.userEmail))) {
    return { sent: false };
  }

  const appSettings = await getSettings().catch(() => null);
  const fromEmail =
    appSettings?.fromEmail ||
    appSettings?.hrDirectorEmail ||
    process.env.GMAIL_USER ||
    '';
  const adminDir = appSettings?.hrDirectorEmail?.trim();
  if (!fromEmail || !adminDir) {
    console.error('[training-completion] Missing from email or Administration Director email');
    return { sent: false };
  }

  const lines = await buildQuizAttemptSummaryForUser(opts.userId, opts.userEmail);
  const quizLines =
    lines.length === 0
      ? '(No quizzes in this program.)'
      : lines.map((l) => `- ${l.moduleName} / ${l.sectionTitle}: ${l.attemptsToPass} submit(s) until perfect`).join('\n');

  const subject = `Training complete: ${opts.userName}`;
  const bodyText = `All assigned training is complete for ${opts.userName} (${opts.userEmail}).\n\nQuiz attempts (submits until first perfect score):\n${quizLines}\n`;

  const toList = uniqueEmails([opts.userEmail, adminDir]);

  for (const to of toList) {
    const result = await sendEmail({ to, subject, body: bodyText }, fromEmail);
    if (!result.sent && result.error) {
      console.error('[training-completion] send failed:', to, result.error);
    }
  }

  await markFullCompletionEmailSent(opts.userId);
  return { sent: true };
}

export function buildTrainingTestEmail(opts: {
  userName: string;
  userEmail: string;
  moduleName: string;
  isTest?: boolean;
}) {
  const subject = `${opts.isTest ? '[TEST] ' : ''}Training complete: ${opts.userName} – ${opts.moduleName}`;
  const bodyText = opts.isTest
    ? `[TEST] Sample completion notice.\n\nTraining complete for ${opts.userName} (${opts.userEmail}) — ${opts.moduleName}.`
    : `Training complete for ${opts.userName} (${opts.userEmail}) — ${opts.moduleName}.`;
  return { subject, bodyText };
}

export async function sendTrainingTestEmailTo(opts: {
  to: string;
  userName: string;
  userEmail: string;
  moduleName: string;
}): Promise<{ fromEmail: string }> {
  const appSettings = await getSettings().catch(() => null);
  const fromEmail =
    appSettings?.fromEmail ||
    appSettings?.hrDirectorEmail ||
    process.env.GMAIL_USER ||
    '';
  if (!fromEmail) throw new Error('From email not configured');
  const { subject, bodyText } = buildTrainingTestEmail({
    userName: opts.userName,
    userEmail: opts.userEmail,
    moduleName: opts.moduleName,
    isTest: true,
  });
  const result = await sendEmail({ to: opts.to, subject, body: bodyText }, fromEmail);
  if (!result.sent) throw new Error(result.error || 'Send failed');
  return { fromEmail };
}
