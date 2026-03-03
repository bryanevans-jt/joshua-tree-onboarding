import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Joshua Tree Service Group
      </h1>
      <p className="text-gray-600">Onboarding</p>
      <div className="flex gap-4">
        <Link href="/admin" className="btn-primary">
          Admin Portal
        </Link>
      </div>
    </main>
  );
}
