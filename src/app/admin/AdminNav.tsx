'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { isSuperadmin } from '@/lib/auth';

export default function AdminNav({ userEmail }: { userEmail: string | null | undefined }) {
  const showAccess = userEmail && isSuperadmin(userEmail);

  return (
    <div className="flex items-center gap-4">
      <nav className="flex gap-4">
        <Link href="/admin" className="text-gray-600 hover:text-gray-900">
          Generate link
        </Link>
        <Link href="/admin/settings" className="text-gray-600 hover:text-gray-900">
          Settings
        </Link>
        <Link href="/admin/documents" className="text-gray-600 hover:text-gray-900">
          Documents
        </Link>
        {showAccess && (
          <Link href="/admin/access" className="text-gray-600 hover:text-gray-900">
            Access
          </Link>
        )}
      </nav>
      <span className="text-sm text-gray-500">{userEmail}</span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/admin/signin' })}
        className="text-sm text-gray-600 hover:text-gray-900"
      >
        Sign out
      </button>
    </div>
  );
}
