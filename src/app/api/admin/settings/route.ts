import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/store';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('[admin/settings GET]', message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return updateSettingsHandler(request);
}

export async function POST(request: Request) {
  return updateSettingsHandler(request);
}

async function updateSettingsHandler(request: Request) {
  try {
    const body = await request.json();
    const settings = await updateSettings({
      hrDirectorEmail: body.hrDirectorEmail,
      communicationsDirectorEmail: body.communicationsDirectorEmail,
      companyName: body.companyName,
      fromEmail: body.fromEmail,
    });
    return NextResponse.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('[admin/settings]', message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
