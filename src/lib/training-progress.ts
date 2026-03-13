import { getSupabase } from './supabase-server';
import type { TrainingVideo } from './training-types';

export interface VideoCompletion {
  videoId: string;
  videoVersion: number;
}

export async function getUserModuleCompletions(
  userId: string,
  moduleId: string
): Promise<VideoCompletion[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_progress')
    .select('video_id, video_version_at_completion')
    .eq('user_id', userId)
    .eq('module_id', moduleId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    videoId: row.video_id,
    videoVersion: row.video_version_at_completion,
  }));
}

export async function recordVideoCompletion(opts: {
  userId: string;
  userEmail: string;
  userName: string;
  moduleId: string;
  video: TrainingVideo;
}): Promise<void> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase.from('training_progress').upsert(
    {
      user_id: opts.userId,
      user_email: opts.userEmail,
      user_name: opts.userName,
      module_id: opts.moduleId,
      video_id: opts.video.id,
      video_version_at_completion: opts.video.version,
      completed_at: now,
    },
    {
      onConflict: 'user_id,module_id,video_id',
    }
  );
  if (error) throw new Error(error.message);
}

export function isModuleCompleteForUser(
  videos: TrainingVideo[],
  completions: VideoCompletion[]
): boolean {
  if (videos.length === 0) return false;
  return videos.every((video) =>
    completions.some(
      (c) => c.videoId === video.id && c.videoVersion === video.version
    )
  );
}

