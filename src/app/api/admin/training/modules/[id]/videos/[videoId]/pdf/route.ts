import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';
import { uploadTrainingPdf, deleteTrainingPdf } from '@/lib/training-storage';

interface RouteParams {
  params: {
    id: string;
    videoId: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
  }

  const name = file.name || 'presentation.pdf';
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const moduleId = params.id;
  const videoId = params.videoId;

  let key: string;
  try {
    key = await uploadTrainingPdf(moduleId, videoId, name, buffer);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to store PDF' },
      { status: 500 }
    );
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_videos')
    .update({
      presentation_pdf_key: key,
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId)
    .eq('module_id', moduleId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update video' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    video: {
      id: data.id,
      title: data.title,
      youtubeUrl: data.youtube_url,
      presentationPdfKey: data.presentation_pdf_key,
    },
  });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const moduleId = params.id;
  const videoId = params.videoId;
  const supabase = getSupabase();

  const { data: existing, error: fetchErr } = await supabase
    .from('training_videos')
    .select('presentation_pdf_key')
    .eq('id', videoId)
    .eq('module_id', moduleId)
    .maybeSingle();
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const key = existing?.presentation_pdf_key as string | null;

  const { error } = await supabase
    .from('training_videos')
    .update({
      presentation_pdf_key: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId)
    .eq('module_id', moduleId);
  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update video' },
      { status: 500 }
    );
  }

  if (key) {
    try {
      await deleteTrainingPdf(key);
    } catch (e) {
      console.error('[training] deleteTrainingPdf failed:', e);
    }
  }

  return NextResponse.json({ ok: true });
}

