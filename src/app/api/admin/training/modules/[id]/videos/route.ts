import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
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

  const moduleId = params.id;
  const supabase = getSupabase();

  const { data: last, error: lastErr } = await supabase
    .from('training_videos')
    .select('order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) {
    return NextResponse.json({ error: lastErr.message }, { status: 500 });
  }
  const nextOrder = (last?.order_index ?? 0) + 1;

  const { data, error } = await supabase
    .from('training_videos')
    .insert({
      module_id: moduleId,
      title,
      youtube_url: youtubeUrl,
      version: 1,
      order_index: nextOrder,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to add video' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    video: {
      id: data.id,
      title: data.title,
      youtubeUrl: data.youtube_url,
      presentationPdfKey: data.presentation_pdf_key ?? null,
    },
  });
}

