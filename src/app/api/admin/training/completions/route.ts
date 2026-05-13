import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';
import { listModules, listSectionsForModule } from '@/lib/training-store';
import { isSectionSatisfied, type SectionProgressRow } from '@/lib/training-progress';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  const modules = await listModules();
  const payload = [];

  for (const m of modules) {
    const sections = await listSectionsForModule(m.id);
    const sectionIds = sections.map((s) => s.id);
    if (sectionIds.length === 0) {
      payload.push({
        id: m.id,
        name: m.name,
        slug: m.slug,
        isCompanyWide: m.isCompanyWide,
        users: [],
      });
      continue;
    }

    const { data: progRows, error } = await supabase
      .from('training_section_progress')
      .select(
        'user_id, section_id, content_version, video_completed_at, quiz_passed_at, quiz_attempts, updated_at'
      )
      .in('section_id', sectionIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(new Set((progRows ?? []).map((r) => r.user_id as string)));
    const users = [];

    for (const uid of userIds) {
      let done = 0;
      let lastActivity: string | null = null;
      for (const s of sections) {
        const row = (progRows ?? []).find(
          (r) => r.user_id === uid && r.section_id === s.id
        );
        const p: SectionProgressRow | null = row
          ? {
              userId: uid,
              sectionId: s.id,
              contentVersion: row.content_version as number,
              videoCompletedAt: row.video_completed_at as string | null,
              quizPassedAt: row.quiz_passed_at as string | null,
              quizAttempts: row.quiz_attempts as number,
            }
          : null;
        if (isSectionSatisfied(s, p)) done += 1;
        const at = row?.updated_at as string | undefined;
        if (at && (!lastActivity || new Date(at) > new Date(lastActivity))) {
          lastActivity = at;
        }
      }
      users.push({
        userId: uid,
        userEmail: uid.includes('@') ? uid : '',
        userName: '',
        completedCount: done,
        totalVideos: sections.length,
        lastCompletedAt: lastActivity,
      });
    }

    payload.push({
      id: m.id,
      name: m.name,
      slug: m.slug,
      isCompanyWide: m.isCompanyWide,
      users,
    });
  }

  return NextResponse.json({ modules: payload });
}
