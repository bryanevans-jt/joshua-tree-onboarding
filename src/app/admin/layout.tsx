import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="font-semibold text-gray-900">
            Joshua Tree – Admin
          </Link>
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
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
