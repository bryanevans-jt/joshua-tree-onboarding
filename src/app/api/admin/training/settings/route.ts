import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isApprovedAdmin } from '@/lib/approved-admins';
import {
  getTrainingSettings,
  updateTrainingSettings,
} from '@/lib/training-store';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await getTrainingSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const allowed = email ? await isApprovedAdmin(email) : false;
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const allowedDomains = Array.isArray(body.allowedDomains)
    ? body.allowedDomains.map((d: string) => d.trim()).filter(Boolean)
    : undefined;
  const notificationEmails = Array.isArray(body.notificationEmails)
    ? body.notificationEmails.map((e: string) => e.trim().toLowerCase()).filter(Boolean)
    : undefined;

  try {
    const updated = await updateTrainingSettings({
      allowedDomains,
      notificationEmails,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}

