import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserModuleCompletions } from '@/lib/training-progress';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moduleId = url.searchParams.get('moduleId') ?? '';

  const session = await getServerSession(authOptions);
  const user = session?.user;
  const userId = (user as any)?.id || user?.email || '';

  if (!moduleId) {
    return NextResponse.json(
      { error: 'moduleId is required' },
      { status: 400 }
    );
  }
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const completions = await getUserModuleCompletions(userId, moduleId);
  return NextResponse.json({ completions });
}

