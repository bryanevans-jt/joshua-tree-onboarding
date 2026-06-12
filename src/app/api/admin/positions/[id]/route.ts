import { NextResponse } from 'next/server';
import { getPositionById, updatePosition } from '@/lib/onboarding-positions';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: { label?: string; active?: boolean } = {};
    if (body.label !== undefined) updates.label = String(body.label);
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    const existing = await getPositionById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }
    const position = await updatePosition(id, updates);
    return NextResponse.json({ position });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
