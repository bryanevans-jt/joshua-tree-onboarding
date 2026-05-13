import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { getRosterRow, getTrainingSettings } from '@/lib/training-store';
import { isApprovedAdmin } from '@/lib/approved-admins';

export default async function TrainingPendingRosterPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) redirect('/training/signin');

  if (await isApprovedAdmin(email)) {
    redirect('/training');
  }

  const roster = await getRosterRow(email);
  if (roster) redirect('/training');

  const settings = await getTrainingSettings();
  const contactName =
    settings.communicationsContactName?.trim() || 'Director of Communication & Creative';
  const contactEmail = settings.communicationsContactEmail?.trim() || null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-md text-center">
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Training access pending</h1>
        <p className="mb-4 text-sm text-gray-600">
          Your account ({email}) is not yet on the training roster. Contact{' '}
          <span className="font-medium text-gray-800">{contactName}</span>
          {contactEmail ? (
            <>
              {' '}
              at{' '}
              <a className="text-teal-600 underline" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>{' '}
            </>
          ) : (
            ' '
          )}
          to be assigned to a team so you can continue.
        </p>
        <Link href="/training/signin" className="btn-secondary text-sm">
          Try again
        </Link>
      </div>
    </div>
  );
}
