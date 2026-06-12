import { getSupabase } from './supabase-server';
import {
  isSectionRequired,
  isSectionSatisfied,
  type SectionProgressRow,
} from './training-progress';
import {
  adminListAllTeams,
  listCompanyWideModules,
  listRoster,
  listSectionsForModule,
  listTeamModulesForTeam,
} from './training-store';
import type { TrainingModule, TrainingSection } from './training-types';

export interface AdminOverviewPerson {
  email: string;
  displayName: string | null;
  supervisorEmail: string;
  teamLabels: string[];
  companyDone: number;
  companyTotal: number;
  teamDone: number;
  teamTotal: number;
  overallPercent: number;
  badge: string;
}

export interface AdminOverviewSupervisorGroup {
  supervisorEmail: string;
  members: AdminOverviewPerson[];
}

function rowToProgress(r: Record<string, unknown>): SectionProgressRow {
  return {
    userId: r.user_id as string,
    sectionId: r.section_id as string,
    contentVersion: (r.content_version as number) ?? 1,
    videoCompletedAt: (r.video_completed_at as string | null) ?? null,
    quizPassedAt: (r.quiz_passed_at as string | null) ?? null,
    quizAttempts: (r.quiz_attempts as number) ?? 0,
  };
}

export async function buildAdminTrainingOverview(): Promise<{
  people: AdminOverviewPerson[];
  bySupervisor: AdminOverviewSupervisorGroup[];
}> {
  const roster = await listRoster();
  const teams = await adminListAllTeams();
  const labelById = new Map(teams.map((t) => [t.id, t.label]));

  const companyMods = await listCompanyWideModules();
  const sectionsCache = new Map<string, TrainingSection[]>();
  async function sectionsOf(modId: string): Promise<TrainingSection[]> {
    if (!sectionsCache.has(modId)) {
      sectionsCache.set(modId, await listSectionsForModule(modId));
    }
    return sectionsCache.get(modId)!;
  }

  const sectionIdSet = new Set<string>();
  for (const m of companyMods) {
    for (const s of await sectionsOf(m.id)) sectionIdSet.add(s.id);
  }
  const allTeamIds = new Set<string>();
  for (const row of roster) {
    for (const tid of row.teamIds) allTeamIds.add(tid);
  }
  const teamModById = new Map<string, TrainingModule>();
  for (const tid of Array.from(allTeamIds)) {
    for (const tm of await listTeamModulesForTeam(tid)) {
      if (!teamModById.has(tm.id)) teamModById.set(tm.id, tm);
    }
  }
  for (const m of Array.from(teamModById.values())) {
    for (const s of await sectionsOf(m.id)) sectionIdSet.add(s.id);
  }

  const sectionIds = Array.from(sectionIdSet);
  const userIds = roster.map((r) => r.email);

  const progressByUser = new Map<string, Map<string, SectionProgressRow>>();
  if (sectionIds.length > 0 && userIds.length > 0) {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from('training_section_progress')
      .select(
        'user_id, section_id, content_version, video_completed_at, quiz_passed_at, quiz_attempts'
      )
      .in('section_id', sectionIds)
      .in('user_id', userIds);
    if (error) throw new Error(error.message);
    for (const raw of rows ?? []) {
      const r = raw as Record<string, unknown>;
      const uid = r.user_id as string;
      const sid = r.section_id as string;
      if (!progressByUser.has(uid)) progressByUser.set(uid, new Map());
      progressByUser.get(uid)!.set(sid, rowToProgress(r));
    }
  }

  const people: AdminOverviewPerson[] = [];
  for (const person of roster) {
    const pmap = progressByUser.get(person.email) ?? new Map();
    let companyDone = 0;
    let companyTotal = 0;
    let teamDone = 0;
    let teamTotal = 0;

    for (const m of companyMods) {
      const sections = await sectionsOf(m.id);
      for (const s of sections) {
        if (!isSectionRequired(s)) continue;
        companyTotal++;
        const p = pmap.get(s.id) ?? null;
        if (isSectionSatisfied(s, p)) companyDone++;
      }
    }

    const seenMod = new Set<string>();
    for (const tid of person.teamIds) {
      for (const tm of await listTeamModulesForTeam(tid)) {
        if (seenMod.has(tm.id)) continue;
        seenMod.add(tm.id);
        const sections = await sectionsOf(tm.id);
        for (const s of sections) {
          if (!isSectionRequired(s)) continue;
          teamTotal++;
          const p = pmap.get(s.id) ?? null;
          if (isSectionSatisfied(s, p)) teamDone++;
        }
      }
    }

    const denom = companyTotal + teamTotal;
    const done = companyDone + teamDone;
    const overallPercent = denom === 0 ? 0 : Math.round((100 * done) / denom);
    let badge = 'Getting started';
    if (overallPercent >= 100) badge = 'Complete';
    else if (overallPercent >= 75) badge = 'Almost there';
    else if (overallPercent >= 50) badge = 'Halfway';
    else if (overallPercent >= 25) badge = 'In motion';

    people.push({
      email: person.email,
      displayName: person.displayName ?? null,
      supervisorEmail: person.supervisorEmail,
      teamLabels: person.teamIds.map((id) => labelById.get(id) ?? id),
      companyDone,
      companyTotal,
      teamDone,
      teamTotal,
      overallPercent,
      badge,
    });
  }

  people.sort((a, b) => a.email.localeCompare(b.email));

  const groupMap = new Map<string, AdminOverviewPerson[]>();
  for (const p of people) {
    const key = p.supervisorEmail.toLowerCase();
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(p);
  }
  const bySupervisor: AdminOverviewSupervisorGroup[] = Array.from(groupMap.entries())
    .map(([, members]) => ({
      supervisorEmail: members[0]!.supervisorEmail,
      members: members.sort((a, b) => a.email.localeCompare(b.email)),
    }))
    .sort((a, b) => a.supervisorEmail.localeCompare(b.supervisorEmail));

  return { people, bySupervisor };
}

/** Same metrics as admin overview, filtered to direct reports of one supervisor. */
export async function buildSupervisorTrainingOverview(
  supervisorEmail: string
): Promise<{ people: AdminOverviewPerson[]; bySupervisor: AdminOverviewSupervisorGroup[] }> {
  const sup = supervisorEmail.trim().toLowerCase();
  const full = await buildAdminTrainingOverview();
  const people = full.people.filter((p) => p.supervisorEmail.trim().toLowerCase() === sup);
  const bySupervisor = full.bySupervisor.filter(
    (g) => g.supervisorEmail.trim().toLowerCase() === sup
  );
  return { people, bySupervisor };
}
