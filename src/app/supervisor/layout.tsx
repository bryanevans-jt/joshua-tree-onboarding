import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isTaggedSupervisor } from '@/lib/training-store';

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    redirect('/training/signin?callbackUrl=/supervisor');
  }

  const tagged =
    session.user?.isTrainingSupervisor === true || (await isTaggedSupervisor(email));

  if (!tagged) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-lg font-semibold text-gray-900">Supervisor portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your account is not tagged as a supervisor yet. Ask a training admin to add your email under{' '}
            <strong>Admin → Training → Roster → Tagged supervisor emails</strong>.
          </p>
          <Link href="/training" className="btn-secondary mt-4 inline-block text-sm">
            Go to Training Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/40">
      <header className="border-b border-indigo-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/supervisor" className="text-lg font-bold text-indigo-950">
            Supervisor portal
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-medium">
            <Link href="/supervisor" className="rounded-lg px-3 py-1.5 text-indigo-800 hover:bg-indigo-50">
              Dashboard
            </Link>
            <Link
              href="/training"
              className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-teal-900 hover:bg-teal-100"
            >
              Training Center
            </Link>
            <Link href="/training/modules" className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50">
              My modules
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
