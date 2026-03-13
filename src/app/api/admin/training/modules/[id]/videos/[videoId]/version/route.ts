import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
    videoId: string;
  };
}

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_videos')
    .update({ version: (supabase as any).rpc ? undefined : undefined })
    .eq('id', params.videoId)
    .eq('module_id', params.id)
    .select()
    .maybeSingle();

  // The above won't actually increment; do it with a select + update instead.
  const { data: existing, error: fetchErr } = await supabase
    .from('training_videos')
    .select('version')
    .eq('id', params.videoId)
    .eq('module_id', params.id)
    .maybeSingle();
  if (fetchErr || !existing) {
    return NextResponse.json(
      { error: fetchErr?.message || 'Video not found' },
      { status: 404 }
    );
  }

  const nextVersion = (existing.version as number) + 1;
  const { data: updated, error: updErr } = await supabase
    .from('training_videos')
    .update({
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.videoId)
    .eq('module_id', params.id)
    .select()
    .single();
  if (updErr) {
    return NextResponse.json(
      { error: updErr.message || 'Failed to bump version' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    video: {
      id: updated.id,
      title: updated.title,
      youtubeUrl: updated.youtube_url,
      version: updated.version,
      presentationPdfKey: updated.presentation_pdf_key ?? null,
    },
  });
}

