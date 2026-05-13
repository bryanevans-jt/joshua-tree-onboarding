import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import {
  getModuleBySlug,
  getRosterRow,
  listSectionsForModule,
  serializeSectionLearner,
} from '@/lib/training-store';
import {
  getSectionProgress,
  isCompanyWideProgramComplete,
  isSectionSatisfied,
} from '@/lib/training-progress';
import { canUserAccessTrainingModule } from '@/lib/training-trainee-access';
import Link from 'next/link';
import { TrainingModuleRunner } from '../TrainingModuleRunner';

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

  if (!(await isApprovedAdmin(email))) {
    const roster = await getRosterRow(email);
    if (!roster) redirect('/training/pending-roster');
  }

  const mod = await getModuleBySlug(slug);
  if (!mod) {
    notFound();
  }

  if (!(await canUserAccessTrainingModule(email, mod))) {
    notFound();
  }

  const userId = email;
  const sections = await listSectionsForModule(mod.id);
  const progress = await Promise.all(
    sections.map(async (s) => {
      const p = await getSectionProgress(userId, s.id);
      return {
        sectionId: s.id,
        satisfied: isSectionSatisfied(s, p),
        videoCompletedAt: p?.videoCompletedAt ?? null,
        quizPassedAt: p?.quizPassedAt ?? null,
        quizAttempts: p?.quizAttempts ?? 0,
        contentVersion: p?.contentVersion ?? null,
      };
    })
  );

  const companyWideProgramComplete = await isCompanyWideProgramComplete(userId);
  const lockedTeamContent = !mod.isCompanyWide && !companyWideProgramComplete;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <Link href="/training/modules" className="mb-4 inline-block text-sm text-teal-600 hover:text-teal-700">
          ← All modules
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">{mod.name}</h1>
        {mod.description && (
          <p className="mb-6 text-gray-600 text-sm max-w-3xl">{mod.description}</p>
        )}

        <TrainingModuleRunner
          initial={{
            module: {
              id: mod.id,
              name: mod.name,
              slug: mod.slug,
              description: mod.description,
              isCompanyWide: mod.isCompanyWide,
              teamId: mod.teamId,
            },
            sections: sections.map(serializeSectionLearner),
            progress,
            lockedTeamContent,
            companyWideProgramComplete,
          }}
        />
      </div>
    </div>
  );
}
