import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getTraineeAggregateProgress } from '@/lib/training-progress';
import { canUseTrainingCenter } from '@/lib/training-trainee-access';
import { isTaggedSupervisor } from '@/lib/training-store';

export default async function TrainingHubPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) redirect('/training/signin');

  if (!(await canUseTrainingCenter(email))) {
    redirect('/training/pending-roster');
  }

  const stats = await getTraineeAggregateProgress(email, email);
  const showSupervisorLink = await isTaggedSupervisor(email);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/80 via-gray-50 to-amber-50/40 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="training-trainee-hero relative overflow-hidden rounded-2xl border border-teal-200/60 bg-gradient-to-br from-white via-teal-50/50 to-amber-50 p-8 shadow-lg">
          <div className="absolute right-4 top-4 select-none text-4xl opacity-20">🏅</div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Training center</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Your learning path</h1>
          <p className="mt-2 text-sm text-gray-600">
            Finish every <strong>company-wide</strong> section first to unlock <strong>team modules</strong> for your
            assigned teams. Progress saves automatically — come back anytime.
          </p>
          <div className="mt-6 rounded-xl border border-teal-100 bg-white/80 p-4 shadow-inner backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Overall progress</p>
                <p className="text-2xl font-bold text-teal-800">{stats.overallPercent}%</p>
                <p className="text-xs text-amber-800">{stats.tierLabel}</p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p>
                  Company-wide:{' '}
                  <span className="font-semibold text-gray-900">
                    {stats.companyDone}/{stats.companyTotal || '—'}
                  </span>
                </p>
                <p>
                  Team modules:{' '}
                  <span className="font-semibold text-gray-900">
                    {stats.teamDone}/{stats.teamTotal || '—'}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 transition-all"
                style={{ width: `${Math.min(100, stats.overallPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {showSupervisorLink && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/90 p-5 text-sm text-indigo-950 shadow-sm">
            <p className="font-semibold">Supervisor dashboard</p>
            <p className="mt-1 text-indigo-900/90">
              You are tagged as a supervisor. View progress for people who report to you.
            </p>
            <Link
              href="/supervisor"
              className="mt-3 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              Open supervisor portal →
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/training/modules"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition hover:border-teal-300 hover:shadow-lg"
          >
            <p className="text-xs font-semibold uppercase text-teal-600">Quest map</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-teal-800">Open modules</h2>
            <p className="mt-2 text-sm text-gray-600">
              Jump into videos, PDFs, and quizzes. Locked team tracks open when company-wide work is done.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-teal-600 group-hover:text-teal-700">
              Continue →
            </span>
          </Link>
          <div className="rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/40 p-6">
            <p className="text-xs font-semibold uppercase text-amber-800">Tip</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">Quizzes & retries</h2>
            <p className="mt-2 text-sm text-gray-600">
              Video quizzes unlock after ~90% watch. Keep going until every answer is correct — that is your
              completion for the section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
