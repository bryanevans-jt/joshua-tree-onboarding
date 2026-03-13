import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getModuleBySlug, listVideosForModule } from '@/lib/training-store';
import { TrainingModuleClient } from '../TrainingModuleClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TrainingModulePage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    redirect(`/training/signin?callbackUrl=${encodeURIComponent(`/training/module/${slug}`)}`);
  }

  const module = await getModuleBySlug(slug);
  if (!module) {
    notFound();
  }

  const videos = await listVideosForModule(module.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          {module.name} Training
        </h1>
        <p className="mb-2 text-gray-700 text-sm max-w-3xl">
          The videos below will guide you through your initial training process. All
          listed videos are required for this module and may be revisited at any time
          as a resource for future reference.
        </p>
        {module.description && (
          <p className="mb-6 text-gray-600 text-sm max-w-3xl">
            {module.description}
          </p>
        )}

        <TrainingModuleClient
          moduleId={module.id}
          moduleName={module.name}
          videos={videos}
        />
      </div>
    </div>
  );
}

