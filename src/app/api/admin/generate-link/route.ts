import { NextResponse } from 'next/server';
import { createLink } from '@/lib/store';
import type { State, Position } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = body.state as State;
    const position = body.position as Position;
    if (!state || !position) {
      return NextResponse.json(
        { error: 'state and position are required' },
        { status: 400 }
      );
    }
    const link = await createLink(state, position);
    return NextResponse.json({ token: link.token, id: link.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
