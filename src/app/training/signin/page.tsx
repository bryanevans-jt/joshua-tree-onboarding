import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import TrainingSignInButton from './TrainingSignInButton';

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function TrainingSignInPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const { callbackUrl } = await searchParams;
  const destination = callbackUrl?.trim() && callbackUrl.startsWith('/training')
    ? callbackUrl
    : '/training';

  if (session) {
    redirect(destination);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="card w-full max-w-sm text-center">
        <h1 className="mb-2 text-xl font-semibold">Training sign in</h1>
        <p className="mb-6 text-sm text-gray-600">
          Sign in with your organization Google account to access your training module.
        </p>
        <TrainingSignInButton callbackUrl={destination} />
        <p className="mt-6 text-xs text-gray-500">
          If you don’t have access, contact your administrator.
        </p>
      </div>
    </div>
  );
}
