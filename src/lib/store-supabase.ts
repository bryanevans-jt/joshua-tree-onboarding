/**
 * Store implementation using Supabase (for Vercel/serverless).
 */

import type { OnboardingLink, AppSettings, OnboardingProgressData } from './types';
import type { State, Position } from './config';
import { getSupabase } from './supabase-server';
import { randomUUID } from 'crypto';

function rowToLink(row: {
  id: string;
  token: string;
  state: string;
  position: string;
  created_at: string;
  completed_at: string | null;
  new_hire_name: string | null;
  progress: unknown;
}): OnboardingLink {
  return {
    id: row.id,
    token: row.token,
    state: row.state as State,
    position: row.position as Position,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    newHireName: row.new_hire_name ?? undefined,
    progress: (row.progress as OnboardingLink['progress']) ?? undefined,
  };
}

export async function createLink(state: State, position: Position): Promise<OnboardingLink> {
  const supabase = getSupabase();
  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '').slice(0, 24);
  const { data, error } = await supabase
    .from('onboarding_links')
    .insert({
      id,
      token,
      state,
      position,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToLink(data);
}

export async function getLinkByToken(token: string): Promise<OnboardingLink | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('onboarding_links')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToLink(data) : undefined;
}

export async function updateLink(
  token: string,
  updates: Partial<Pick<OnboardingLink, 'completedAt' | 'newHireName'>>
): Promise<OnboardingLink | undefined> {
  const supabase = getSupabase();
  const body: Record<string, unknown> = {};
  if (updates.completedAt !== undefined) body.completed_at = updates.completedAt;
  if (updates.newHireName !== undefined) body.new_hire_name = updates.newHireName;
  if (Object.keys(body).length === 0) return getLinkByToken(token);
  const { data, error } = await supabase
    .from('onboarding_links')
    .update(body)
    .eq('token', token)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data ? rowToLink(data) : undefined;
}

export async function saveProgress(
  token: string,
  progress: OnboardingProgressData
): Promise<OnboardingLink | undefined> {
  const link = await getLinkByToken(token);
  if (!link) return undefined;
  const merged = {
    newHireName: progress.newHireName ?? link.progress?.newHireName,
    uploadedDocumentKeys: progress.uploadedDocumentKeys !== undefined
      ? (Object.keys(progress.uploadedDocumentKeys).length === 0 ? {} : { ...link.progress?.uploadedDocumentKeys, ...progress.uploadedDocumentKeys })
      : (link.progress?.uploadedDocumentKeys ?? {}),
    signatures: { ...link.progress?.signatures, ...(progress.signatures ?? {}) },
    uploads: { ...link.progress?.uploads, ...(progress.uploads ?? {}) },
    confirmedStepIds: progress.confirmedStepIds ?? link.progress?.confirmedStepIds,
    formData: { ...link.progress?.formData, ...(progress.formData ?? {}) },
  };
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('onboarding_links')
    .update({ progress: merged })
    .eq('token', token)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data ? rowToLink(data) : undefined;
}

export async function getProgress(token: string): Promise<OnboardingProgressData | undefined> {
  const link = await getLinkByToken(token);
  return link?.progress;
}

export async function getSettings(): Promise<AppSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return {
      hrDirectorEmail: '',
      communicationsDirectorEmail: '',
      fromEmail: undefined,
      companyName: 'Joshua Tree Service Group',
    };
  }
  return {
    hrDirectorEmail: data.hr_director_email ?? '',
    communicationsDirectorEmail: data.communications_director_email ?? '',
    fromEmail: data.from_email ?? undefined,
    companyName: data.company_name ?? 'Joshua Tree Service Group',
  };
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const supabase = getSupabase();
  let existing: AppSettings;
  try {
    existing = await getSettings();
  } catch {
    existing = {
      hrDirectorEmail: '',
      communicationsDirectorEmail: '',
      companyName: 'Joshua Tree Service Group',
    };
  }
  const row = {
    id: 1,
    hr_director_email: updates.hrDirectorEmail ?? existing.hrDirectorEmail,
    communications_director_email:
      updates.communicationsDirectorEmail ?? existing.communicationsDirectorEmail,
    from_email: updates.fromEmail !== undefined ? updates.fromEmail : existing.fromEmail ?? null,
    company_name: updates.companyName ?? existing.companyName,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('app_settings')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    hrDirectorEmail: data?.hr_director_email ?? '',
    communicationsDirectorEmail: data?.communications_director_email ?? '',
    fromEmail: data?.from_email ?? undefined,
    companyName: data?.company_name ?? 'Joshua Tree Service Group',
  };
}

export async function getAllLinks(): Promise<OnboardingLink[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('onboarding_links').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToLink);
}
