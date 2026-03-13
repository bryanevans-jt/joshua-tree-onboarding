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

// Update title / YouTube URL
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const title = (body.title as string | undefined)?.trim();
  const youtubeUrl = (body.youtubeUrl as string | undefined)?.trim();
  if (!title || !youtubeUrl) {
    return NextResponse.json(
      { error: 'Title and YouTube URL are required' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_videos')
    .update({
      title,
      youtube_url: youtubeUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.videoId)
    .eq('module_id', params.id)
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update video' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    video: {
      id: data.id,
      title: data.title,
      youtubeUrl: data.youtube_url,
      version: data.version,
      presentationPdfKey: data.presentation_pdf_key ?? null,
    },
  });
}

// Delete video
export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('training_videos')
    .delete()
    .eq('id', params.videoId)
    .eq('module_id', params.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete video' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

