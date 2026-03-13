'use client';

import { signIn } from 'next-auth/react';

export default function TrainingSignInButton({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl })}
      className="btn-primary w-full"
    >
      Sign in with Google
    </button>
  );
}
