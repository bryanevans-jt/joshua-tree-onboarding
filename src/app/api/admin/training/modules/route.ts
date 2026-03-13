import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { getSupabase } from '@/lib/supabase-server';
import { listModules } from '@/lib/training-store';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const modules = await listModules();
  return NextResponse.json({ modules });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const name = (body.name as string | undefined)?.trim();
  const slug = (body.slug as string | undefined)?.trim();
  const description = (body.description as string | undefined)?.trim() || null;
  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_modules')
    .insert({
      name,
      slug,
      description,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to create module' },
      { status: 500 }
    );
  }

  return NextResponse.json({ module: data });
}

