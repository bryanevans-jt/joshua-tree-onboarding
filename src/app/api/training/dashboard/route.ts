import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import {
  getSectionProgress,
  isCompanyWideProgramComplete,
  isSectionSatisfied,
} from '@/lib/training-progress';
import {
  getModuleBySlug,
  getRosterRow,
  getTeamModuleForTeam,
  listCompanyWideModules,
  listSectionsForModule,
  serializeSection,
} from '@/lib/training-store';

function uid(session: { user?: { email?: string | null } } | null) {
  return (session?.user?.email as string) || '';
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = uid(session);
  const isAdmin = await isApprovedAdmin(email);
  const roster = await getRosterRow(email);

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug')?.trim();
  if (slug) {
    const mod = await getModuleBySlug(slug);
    if (!mod) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!isAdmin) {
      if (!roster) {
        return NextResponse.json({ error: 'Not on roster' }, { status: 403 });
      }
      if (mod.isCompanyWide) {
        /* ok */
      } else if (mod.teamId !== roster.teamId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    const sections = await listSectionsForModule(mod.id);
    const companyDone = await isCompanyWideProgramComplete(userId);
    const lockedTeam = !mod.isCompanyWide && !companyDone;
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
    return NextResponse.json({
      module: {
        id: mod.id,
        name: mod.name,
        slug: mod.slug,
        description: mod.description,
        isCompanyWide: mod.isCompanyWide,
        teamId: mod.teamId,
        lockedTeamContent: lockedTeam,
        companyWideProgramComplete: companyDone,
      },
      sections: sections.map((s) => ({
        ...serializeSection(s),
        lockedForInteraction: lockedTeam && !mod.isCompanyWide,
      })),
      progress,
    });
  }

  const companyModules = await listCompanyWideModules();
  const companyWideProgramComplete = await isCompanyWideProgramComplete(userId);
  const companyPayload = [];
  for (const m of companyModules) {
    const sections = await listSectionsForModule(m.id);
    let done = 0;
    for (const s of sections) {
      const p = await getSectionProgress(userId, s.id);
      if (isSectionSatisfied(s, p)) done++;
    }
    companyPayload.push({
      id: m.id,
      name: m.name,
      slug: m.slug,
      total: sections.length,
      done,
    });
  }

  let team: {
    id: string;
    name: string;
    slug: string;
    total: number;
    done: number;
    locked: boolean;
  } | null = null;
  if (roster) {
    const tm = await getTeamModuleForTeam(roster.teamId);
    if (tm) {
      const sections = await listSectionsForModule(tm.id);
      let done = 0;
      for (const s of sections) {
        const p = await getSectionProgress(userId, s.id);
        if (isSectionSatisfied(s, p)) done++;
      }
      team = {
        id: tm.id,
        name: tm.name,
        slug: tm.slug,
        total: sections.length,
        done,
        locked: !companyWideProgramComplete,
      };
    }
  }

  return NextResponse.json({
    roster: roster
      ? { email: roster.email, teamId: roster.teamId, supervisorEmail: roster.supervisorEmail }
      : null,
    isAdminPreview: isAdmin && !roster,
    companyWideProgramComplete,
    companyModules: companyPayload,
    teamModule: team,
  });
}
