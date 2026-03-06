import { notFound } from 'next/navigation';
import { getLinkByToken } from '@/lib/store';
import { OnboardingFlow } from './OnboardingFlow';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function OnboardPage({ params }: PageProps) {
  const { token } = await params;
  const link = await getLinkByToken(token);
  if (!link) notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          New Hire Onboarding
        </h1>
        <p className="mb-8 text-gray-600">
          {link.position} – {link.state}
        </p>
        <OnboardingFlow token={token} state={link.state} position={link.position} />
      </div>
    </div>
  );
}
