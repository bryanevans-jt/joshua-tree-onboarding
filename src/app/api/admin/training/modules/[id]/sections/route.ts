import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';
import { createSection, listSectionsForModule, serializeSectionAdmin } from '@/lib/training-store';
import { parseQuizJson } from '@/lib/training-quiz';

interface RouteParams {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const moduleId = params.id;
  const body = await request.json();
  const kind = body.kind as 'video' | 'pdf' | undefined;
  const title = (body.title as string | undefined)?.trim();
  if (!kind || (kind !== 'video' && kind !== 'pdf') || !title) {
    return NextResponse.json({ error: 'kind (video|pdf) and title are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: last } = await supabase
    .from('training_sections')
    .select('order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.order_index ?? 0) + 1;
  const orderIndex =
    body.orderIndex !== undefined ? Math.floor(Number(body.orderIndex)) : nextOrder;

  const youtubeUrl = kind === 'video' ? (body.youtubeUrl as string | undefined)?.trim() || null : null;
  const quiz = parseQuizJson(body.quiz ?? null);

  try {
    const section = await createSection({
      moduleId,
      orderIndex: Number.isNaN(orderIndex) ? nextOrder : orderIndex,
      kind,
      title,
      youtubeUrl,
      pdfKey: null,
      quiz,
      summary: (body.summary as string | undefined)?.trim() || null,
      estimatedMinutes:
        body.estimatedMinutes !== undefined && body.estimatedMinutes !== null
          ? Math.max(0, Math.floor(Number(body.estimatedMinutes)))
          : null,
      isOptional: !!body.isOptional,
    });
    return NextResponse.json({ section: serializeSectionAdmin(section) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create section' },
      { status: 500 }
    );
  }
}
