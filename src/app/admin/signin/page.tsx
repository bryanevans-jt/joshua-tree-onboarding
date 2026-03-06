import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import SignInButton from './SignInButton';

export default async function AdminSignInPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="card w-full max-w-sm text-center">
        <h1 className="mb-2 text-xl font-semibold">Admin sign in</h1>
        <p className="mb-6 text-sm text-gray-600">
          Sign in with a Google account that has been approved for admin access.
        </p>
        <SignInButton />
        <p className="mt-6 text-xs text-gray-500">
          If you don’t have access, contact your administrator.
        </p>
      </div>
    </div>
  );
}
