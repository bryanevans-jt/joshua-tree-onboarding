import { getSupabase } from './supabase-server';
import type {
  TrainingModule,
  TrainingRosterRow,
  TrainingSection,
  TrainingSettings,
  TrainingTeam,
} from './training-types';
import { parseQuizJson, type TrainingQuiz } from './training-quiz';

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

function rowTeam(r: any): TrainingTeam {
  return {
    id: r.id,
    slug: r.slug,
    label: r.label,
    sortOrder: r.sort_order ?? 0,
    active: r.active !== false,
  };
}

function rowModule(r: any): TrainingModule {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    isCompanyWide: !!r.is_company_wide,
    teamId: r.team_id ?? null,
    moduleSortOrder: r.module_sort_order ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? null,
  };
}

function rowSection(r: any): TrainingSection {
  return {
    id: r.id,
    moduleId: r.module_id,
    orderIndex: r.order_index,
    kind: r.kind,
    title: r.title,
    youtubeUrl: r.youtube_url ?? null,
    pdfKey: r.pdf_key ?? null,
    quiz: parseQuizJson(r.quiz_json),
    contentVersion: r.content_version ?? 1,
    summary: r.summary ?? null,
    estimatedMinutes: r.estimated_minutes ?? null,
    isOptional: !!r.is_optional,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? null,
  };
}

// ---------- Teams ----------

export async function listTeams(): Promise<TrainingTeam[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_teams')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowTeam);
}

export async function adminListAllTeams(): Promise<TrainingTeam[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_teams')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowTeam);
}

export async function adminUpsertTeam(input: {
  id?: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
}): Promise<TrainingTeam> {
  const supabase = getSupabase();
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, '-');
  const row = {
    slug,
    label: input.label.trim(),
    sort_order: input.sortOrder,
    active: input.active,
  };
  if (input.id) {
    const { data, error } = await supabase
      .from('training_teams')
      .update(row)
      .eq('id', input.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowTeam(data);
  }
  const { data, error } = await supabase.from('training_teams').insert(row).select().single();
  if (error) throw new Error(error.message);
  return rowTeam(data);
}

// ---------- Supervisors (tagged emails) ----------

export async function listTaggedSupervisors(): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_supervisors')
    .select('email')
    .order('email', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { email: string }) => normEmail(r.email));
}

export async function addTaggedSupervisor(email: string): Promise<void> {
  const supabase = getSupabase();
  const e = normEmail(email);
  if (!e) throw new Error('Email required');
  const { error } = await supabase.from('training_supervisors').insert({ email: e });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function removeTaggedSupervisor(email: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('training_supervisors').delete().eq('email', normEmail(email));
}

export async function isTaggedSupervisor(email: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('training_supervisors')
    .select('email')
    .eq('email', normEmail(email))
    .maybeSingle();
  return !!data;
}

// ---------- Roster ----------

export async function getRosterRow(email: string): Promise<TrainingRosterRow | null> {
  const supabase = getSupabase();
  const e = normEmail(email);
  const { data, error } = await supabase.from('training_roster').select('*').eq('email', e).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { data: teamRows, error: e2 } = await supabase
    .from('training_roster_teams')
    .select('team_id')
    .eq('email', e);
  if (e2) throw new Error(e2.message);
  return {
    email: data.email,
    teamIds: (teamRows ?? []).map((t: { team_id: string }) => t.team_id),
    supervisorEmail: normEmail(data.supervisor_email),
    displayName: data.display_name ?? null,
  };
}

export async function listRoster(): Promise<TrainingRosterRow[]> {
  const supabase = getSupabase();
  const { data: people, error } = await supabase.from('training_roster').select('*').order('email', {
    ascending: true,
  });
  if (error) throw new Error(error.message);
  const { data: links, error: e2 } = await supabase.from('training_roster_teams').select('email, team_id');
  if (e2) throw new Error(e2.message);
  const map = new Map<string, string[]>();
  for (const l of links ?? []) {
    const em = normEmail((l as { email: string }).email);
    const arr = map.get(em) ?? [];
    arr.push((l as { team_id: string }).team_id);
    map.set(em, arr);
  }
  return (people ?? []).map((r: any) => ({
    email: r.email,
    teamIds: map.get(normEmail(r.email)) ?? [],
    supervisorEmail: normEmail(r.supervisor_email),
    displayName: r.display_name ?? null,
  }));
}

export async function upsertRosterRow(row: TrainingRosterRow): Promise<void> {
  const supabase = getSupabase();
  const sup = normEmail(row.supervisorEmail);
  const tagged = await isTaggedSupervisor(sup);
  if (!tagged) {
    throw new Error('Supervisor email must be tagged as a supervisor first.');
  }
  const e = normEmail(row.email);
  if (!row.teamIds.length) {
    throw new Error('Select at least one team.');
  }
  const teams = await adminListAllTeams();
  const valid = new Set(teams.filter((t) => t.active).map((t) => t.id));
  for (const tid of row.teamIds) {
    if (!valid.has(tid)) throw new Error('Invalid or inactive team selected.');
  }
  const { error: err1 } = await supabase.from('training_roster').upsert(
    {
      email: e,
      supervisor_email: sup,
      display_name: row.displayName?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );
  if (err1) throw new Error(err1.message);
  await supabase.from('training_roster_teams').delete().eq('email', e);
  const rows = row.teamIds.map((team_id) => ({ email: e, team_id }));
  const { error: err2 } = await supabase.from('training_roster_teams').insert(rows);
  if (err2) throw new Error(err2.message);
}

export async function deleteRosterRow(email: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('training_roster').delete().eq('email', normEmail(email));
}

// ---------- Modules ----------

export async function listModules(): Promise<TrainingModule[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .order('is_company_wide', { ascending: false })
    .order('module_sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowModule);
}

export async function getModuleBySlug(slug: string): Promise<TrainingModule | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowModule(data) : null;
}

export async function getModuleById(id: string): Promise<TrainingModule | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowModule(data) : null;
}

export async function createModule(input: {
  name: string;
  slug: string;
  description?: string | null;
  isCompanyWide: boolean;
  teamId?: string | null;
  moduleSortOrder?: number;
}): Promise<TrainingModule> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      is_company_wide: input.isCompanyWide,
      team_id: input.isCompanyWide ? null : input.teamId ?? null,
      module_sort_order: input.moduleSortOrder ?? 0,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowModule(data);
}

export async function updateModule(
  id: string,
  input: {
    name: string;
    slug: string;
    description?: string | null;
    isCompanyWide: boolean;
    teamId?: string | null;
    moduleSortOrder?: number;
  }
): Promise<TrainingModule> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .update({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      is_company_wide: input.isCompanyWide,
      team_id: input.isCompanyWide ? null : input.teamId ?? null,
      module_sort_order: input.moduleSortOrder ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowModule(data);
}

export async function deleteModule(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('training_modules').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listCompanyWideModules(): Promise<TrainingModule[]> {
  const all = await listModules();
  return all.filter((m) => m.isCompanyWide);
}

/** All non–company-wide modules tied to a team (usually one; multiple allowed). */
export async function listTeamModulesForTeam(teamId: string): Promise<TrainingModule[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .eq('is_company_wide', false)
    .eq('team_id', teamId)
    .order('module_sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowModule);
}

// ---------- Sections ----------

export async function listSectionsForModule(moduleId: string): Promise<TrainingSection[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_sections')
    .select('*')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowSection);
}

export async function getSectionById(sectionId: string): Promise<TrainingSection | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_sections')
    .select('*')
    .eq('id', sectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowSection(data) : null;
}

export async function createSection(input: {
  moduleId: string;
  orderIndex: number;
  kind: 'video' | 'pdf';
  title: string;
  youtubeUrl?: string | null;
  pdfKey?: string | null;
  quiz?: TrainingQuiz | null;
  summary?: string | null;
  estimatedMinutes?: number | null;
  isOptional?: boolean;
}): Promise<TrainingSection> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_sections')
    .insert({
      module_id: input.moduleId,
      order_index: input.orderIndex,
      kind: input.kind,
      title: input.title.trim(),
      youtube_url: input.kind === 'video' ? input.youtubeUrl?.trim() || null : null,
      pdf_key: input.kind === 'pdf' ? input.pdfKey ?? null : null,
      quiz_json: input.quiz && input.quiz.questions.length ? input.quiz : null,
      content_version: 1,
      summary: input.summary?.trim() || null,
      estimated_minutes:
        input.estimatedMinutes != null ? Math.max(0, Math.floor(input.estimatedMinutes)) : null,
      is_optional: !!input.isOptional,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowSection(data);
}

export async function updateSection(
  sectionId: string,
  input: {
    title: string;
    youtubeUrl?: string | null;
    pdfKey?: string | null;
    quiz?: TrainingQuiz | null;
    summary?: string | null;
    estimatedMinutes?: number | null;
    isOptional?: boolean;
  }
): Promise<TrainingSection> {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from('training_sections')
    .select('kind')
    .eq('id', sectionId)
    .single();
  const kind = existing?.kind as 'video' | 'pdf';
  const patch: Record<string, unknown> = {
    title: input.title.trim(),
    youtube_url: kind === 'video' ? input.youtubeUrl?.trim() || null : null,
    pdf_key: kind === 'pdf' ? input.pdfKey ?? null : null,
    quiz_json: input.quiz && input.quiz.questions.length ? input.quiz : null,
    summary: input.summary?.trim() || null,
    estimated_minutes:
      input.estimatedMinutes != null ? Math.max(0, Math.floor(input.estimatedMinutes)) : null,
    updated_at: new Date().toISOString(),
  };
  if (input.isOptional !== undefined) {
    patch.is_optional = input.isOptional;
  }
  const { data, error } = await supabase
    .from('training_sections')
    .update(patch)
    .eq('id', sectionId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowSection(data);
}

export async function reorderSections(moduleId: string, orderedSectionIds: string[]): Promise<void> {
  const supabase = getSupabase();
  const sections = await listSectionsForModule(moduleId);
  const set = new Set(sections.map((s) => s.id));
  if (orderedSectionIds.length !== set.size || !orderedSectionIds.every((id) => set.has(id))) {
    throw new Error('Invalid section order');
  }
  for (let i = 0; i < orderedSectionIds.length; i++) {
    const { error } = await supabase
      .from('training_sections')
      .update({ order_index: i + 1, updated_at: new Date().toISOString() })
      .eq('id', orderedSectionIds[i])
      .eq('module_id', moduleId);
    if (error) throw new Error(error.message);
  }
}

export async function deleteSection(sectionId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('training_sections').delete().eq('id', sectionId);
  if (error) throw new Error(error.message);
}

export async function bumpSectionContentVersion(sectionId: string): Promise<TrainingSection> {
  const supabase = getSupabase();
  const { data: cur } = await supabase
    .from('training_sections')
    .select('content_version')
    .eq('id', sectionId)
    .single();
  const next = (cur?.content_version as number) + 1;
  const { data, error } = await supabase
    .from('training_sections')
    .update({
      content_version: next,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sectionId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await supabase.from('training_section_progress').delete().eq('section_id', sectionId);
  return rowSection(data);
}

export function serializeSectionLearner(s: TrainingSection) {
  return {
    id: s.id,
    title: s.title,
    kind: s.kind,
    orderIndex: s.orderIndex,
    youtubeUrl: s.youtubeUrl ?? null,
    hasPdf: !!s.pdfKey,
    summary: s.summary ?? null,
    estimatedMinutes: s.estimatedMinutes ?? null,
    contentVersion: s.contentVersion,
    isOptional: s.isOptional,
    quiz: s.quiz
      ? {
          questions: s.quiz.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            choices: q.choices,
          })),
        }
      : null,
  };
}

export function serializeSection(s: TrainingSection) {
  return {
    id: s.id,
    moduleId: s.moduleId,
    orderIndex: s.orderIndex,
    kind: s.kind,
    title: s.title,
    youtubeUrl: s.youtubeUrl ?? null,
    hasPdf: !!s.pdfKey,
    hasQuiz: !!(s.quiz && s.quiz.questions.length),
    quizQuestionCount: s.quiz?.questions.length ?? 0,
    contentVersion: s.contentVersion,
    summary: s.summary ?? null,
    estimatedMinutes: s.estimatedMinutes ?? null,
    isOptional: s.isOptional,
  };
}

export function serializeSectionAdmin(s: TrainingSection) {
  return {
    ...serializeSection(s),
    youtubeUrl: s.youtubeUrl ?? null,
    pdfKey: s.pdfKey ?? null,
    quiz: s.quiz,
  };
}

// ---------- Settings ----------

export async function getTrainingSettings(): Promise<TrainingSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) {
    return {
      allowedDomains: [],
      notificationEmails: [],
      communicationsContactName: null,
      communicationsContactEmail: null,
    };
  }
  return {
    allowedDomains: (data.allowed_domains as string[]) ?? [],
    notificationEmails: (data.notification_emails as string[]) ?? [],
    communicationsContactName: data.communications_contact_name ?? null,
    communicationsContactEmail: data.communications_contact_email ?? null,
  };
}

export async function updateTrainingSettings(
  updates: Partial<TrainingSettings>
): Promise<TrainingSettings> {
  const supabase = getSupabase();
  const existing = await getTrainingSettings();
  const row: Record<string, unknown> = {
    id: 1,
    allowed_domains: updates.allowedDomains ?? existing.allowedDomains,
    notification_emails: updates.notificationEmails ?? existing.notificationEmails,
    communications_contact_name:
      updates.communicationsContactName !== undefined
        ? updates.communicationsContactName
        : existing.communicationsContactName,
    communications_contact_email:
      updates.communicationsContactEmail !== undefined
        ? updates.communicationsContactEmail
        : existing.communicationsContactEmail,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('training_settings')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    allowedDomains: (data.allowed_domains as string[]) ?? [],
    notificationEmails: (data.notification_emails as string[]) ?? [],
    communicationsContactName: data.communications_contact_name ?? null,
    communicationsContactEmail: data.communications_contact_email ?? null,
  };
}
