import { getSupabase } from './supabase-server';
import type {
  TrainingModule,
  TrainingVideo,
  TrainingSettings,
} from './training-types';

// ---------- Modules ----------

function rowToModule(row: any): TrainingModule {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function getModuleBySlug(slug: string): Promise<TrainingModule | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToModule(data) : null;
}

export async function listModules(): Promise<TrainingModule[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToModule);
}

// ---------- Videos ----------

function rowToVideo(row: any): TrainingVideo {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    youtubeUrl: row.youtube_url,
    version: row.version,
    orderIndex: row.order_index,
    presentationPdfKey: row.presentation_pdf_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function listVideosForModule(moduleId: string): Promise<TrainingVideo[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_videos')
    .select('*')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToVideo);
}

// ---------- Settings ----------

export async function getTrainingSettings(): Promise<TrainingSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    // Fall back to env-only defaults if table not present yet.
    return {
      allowedDomains: [],
      notificationEmails: [],
    };
  }
  if (!data) {
    return {
      allowedDomains: [],
      notificationEmails: [],
    };
  }
  return {
    allowedDomains: (data.allowed_domains as string[]) ?? [],
    notificationEmails: (data.notification_emails as string[]) ?? [],
  };
}

export async function updateTrainingSettings(
  updates: Partial<TrainingSettings>
): Promise<TrainingSettings> {
  const supabase = getSupabase();
  let existing: TrainingSettings;
  try {
    existing = await getTrainingSettings();
  } catch {
    existing = { allowedDomains: [], notificationEmails: [] };
  }
  const row = {
    id: 1,
    allowed_domains: updates.allowedDomains ?? existing.allowedDomains,
    notification_emails: updates.notificationEmails ?? existing.notificationEmails,
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
  };
}

