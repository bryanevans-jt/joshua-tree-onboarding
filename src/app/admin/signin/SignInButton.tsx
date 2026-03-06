'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: '/admin' })}
      className="btn-primary w-full"
    >
      Sign in with Google
    </button>
  );
}
