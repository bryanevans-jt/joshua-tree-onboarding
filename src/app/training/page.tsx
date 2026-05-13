import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getRosterRow } from '@/lib/training-store';

export default async function TrainingHubPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) redirect('/training/signin');

  if (!(await isApprovedAdmin(email))) {
    const roster = await getRosterRow(email);
    if (!roster) redirect('/training/pending-roster');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Training center</h1>
        <p className="mb-8 text-sm text-gray-600">
          Complete all company-wide modules first. Your team module unlocks after that.
        </p>
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Your modules</h2>
          <p className="text-sm text-gray-600">
            Open each module below. Progress is saved automatically. You can return here anytime to
            review videos, PDFs, and quizzes.
          </p>
          <div className="mt-4">
            <Link
              href="/training/modules"
              className="inline-flex text-sm font-medium text-teal-600 underline hover:text-teal-700"
            >
              View all assigned modules →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
