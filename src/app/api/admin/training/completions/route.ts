import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();

  const { data: modules, error: modErr } = await supabase
    .from('training_modules')
    .select('id, name, slug')
    .order('name', { ascending: true });
  if (modErr) {
    return NextResponse.json({ error: modErr.message }, { status: 500 });
  }

  const { data: videos, error: vidErr } = await supabase
    .from('training_videos')
    .select('id, module_id');
  if (vidErr) {
    return NextResponse.json({ error: vidErr.message }, { status: 500 });
  }

  const { data: progress, error: progErr } = await supabase
    .from('training_progress')
    .select('user_id, user_email, user_name, module_id, video_id, video_version_at_completion');
  if (progErr) {
    return NextResponse.json({ error: progErr.message }, { status: 500 });
  }

  const videosByModule = new Map<string, string[]>();
  for (const v of videos ?? []) {
    const list = videosByModule.get(v.module_id) ?? [];
    list.push(v.id);
    videosByModule.set(v.module_id, list);
  }

  const usersByModule = new Map<
    string,
    Array<{
      userId: string;
      userEmail: string;
      userName: string;
      completedCount: number;
      totalVideos: number;
    }>
  >();

  const grouped = new Map<
    string,
    Map<
      string,
      Set<string>
    >
  >();

  for (const row of progress ?? []) {
    const modId = row.module_id as string;
    const userId = row.user_id as string;
    const vidId = row.video_id as string;
    if (!grouped.has(modId)) grouped.set(modId, new Map());
    const users = grouped.get(modId)!;
    if (!users.has(userId)) users.set(userId, new Set());
    users.get(userId)!.add(vidId);
  }

  for (const mod of modules ?? []) {
    const totalVideos = videosByModule.get(mod.id)?.length ?? 0;
    const userMap = grouped.get(mod.id) ?? new Map();
    const rows: Array<{
      userId: string;
      userEmail: string;
      userName: string;
      completedCount: number;
      totalVideos: number;
    }> = [];
    for (const [userId, vids] of userMap.entries()) {
      const sample = (progress ?? []).find(
        (p) => p.user_id === userId && p.module_id === mod.id
      );
      rows.push({
        userId,
        userEmail: sample?.user_email ?? '',
        userName: sample?.user_name ?? '',
        completedCount: vids.size,
        totalVideos,
      });
    }
    usersByModule.set(mod.id, rows);
  }

  return NextResponse.json({
    modules: (modules ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      users: usersByModule.get(m.id) ?? [],
    })),
  });
}

