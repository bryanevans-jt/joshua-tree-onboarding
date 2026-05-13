import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getTraineeAggregateProgress } from '@/lib/training-progress';
import { canUseTrainingCenter, canUserAccessTrainingModule } from '@/lib/training-trainee-access';
import { isTaggedSupervisor, listModules } from '@/lib/training-store';

export default async function TrainingModulesListPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) redirect('/training/signin');

  if (!(await canUseTrainingCenter(email))) {
    redirect('/training/pending-roster');
  }

  const all = await listModules();
  const visible = [];
  for (const m of all) {
    if (await canUserAccessTrainingModule(email, m)) {
      visible.push(m);
    }
  }

  const stats = await getTraineeAggregateProgress(email, email);
  const showSupervisorLink = await isTaggedSupervisor(email);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50/30 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/training" className="mb-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800">
          ← Training home
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your modules</h1>
            <p className="mt-1 text-sm text-gray-600">
              {stats.tierLabel} · {stats.overallPercent}% complete overall
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showSupervisorLink && (
              <Link
                href="/supervisor"
                className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
              >
                Supervisor portal
              </Link>
            )}
            <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-teal-900 shadow ring-1 ring-teal-100">
              {stats.companyDone + stats.teamDone} / {stats.companyTotal + stats.teamTotal || '—'} sections done
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="card border-dashed border-gray-300 text-center shadow-inner">
            <p className="text-sm text-gray-600">No modules are assigned to you yet.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {visible.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-md backdrop-blur-sm transition hover:border-teal-200 hover:shadow-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    <span
                      className={`mr-2 inline-flex rounded-full px-2 py-0.5 font-medium ${
                        m.isCompanyWide ? 'bg-indigo-100 text-indigo-900' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {m.isCompanyWide ? 'Company-wide' : 'Team track'}
                    </span>
                    <span className="font-mono text-gray-400">/training/module/{m.slug}</span>
                  </p>
                </div>
                <Link
                  href={`/training/module/${m.slug}`}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-teal-500 hover:to-emerald-500"
                >
                  Launch →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
