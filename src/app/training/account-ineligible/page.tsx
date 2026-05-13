import Link from 'next/link';

export default function TrainingAccountIneligiblePage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams.reason;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-md text-center">
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Training sign-in unavailable</h1>
        <p className="mb-4 text-sm text-gray-600">
          {reason === 'domain'
            ? 'Only Joshua Tree organization accounts (@thejoshuatree.org) may use the training center.'
            : 'Your account is not eligible to use the training center with this sign-in.'}
        </p>
        <p className="mb-6 text-sm text-gray-600">
          If you believe this is a mistake, contact the Director of Communication & Creative.
        </p>
        <Link href="/training/signin" className="btn-secondary text-sm">
          Back to training sign in
        </Link>
        <p className="mt-4 text-xs text-gray-500">
          <Link href="/admin/signin" className="text-teal-600 underline">
            Admin sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
