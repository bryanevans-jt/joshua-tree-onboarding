import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';
import { listSectionsForModule } from '@/lib/training-store';

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

  const body = await request.json();
  const userId = (body.userId as string | undefined)?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const sections = await listSectionsForModule(params.id);
  for (const s of sections) {
    const { error } = await supabase
      .from('training_section_progress')
      .delete()
      .eq('section_id', s.id)
      .eq('user_id', userId);
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to reset progress' },
        { status: 500 }
      );
    }
  }

  await supabase.from('training_full_completion').delete().eq('user_id', userId);

  return NextResponse.json({ ok: true });
}
