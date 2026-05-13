import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { canUserAccessTrainingModule } from '@/lib/training-trainee-access';
import { getRosterRow, listModules } from '@/lib/training-store';

export default async function TrainingModulesListPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) redirect('/training/signin');

  if (!(await isApprovedAdmin(email))) {
    const roster = await getRosterRow(email);
    if (!roster) redirect('/training/pending-roster');
  }

  const all = await listModules();
  const visible = [];
  for (const m of all) {
    if (await canUserAccessTrainingModule(email, m)) {
      visible.push(m);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/training" className="mb-4 inline-block text-sm text-teal-600 hover:text-teal-700">
          ← Training home
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Modules</h1>
        {visible.length === 0 ? (
          <div className="card">
            <p className="text-sm text-gray-600">No modules are assigned to you yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((m) => (
              <li key={m.id} className="card flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {m.isCompanyWide ? 'Company-wide' : 'Team module'} ·{' '}
                    <span className="font-mono">/training/module/{m.slug}</span>
                  </p>
                </div>
                <Link
                  href={`/training/module/${m.slug}`}
                  className="btn-secondary shrink-0 text-sm whitespace-nowrap"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
