import { NextResponse } from 'next/server';
import { createLink } from '@/lib/store';
import { STATES, type State } from '@/lib/config';
import { isActivePositionForState } from '@/lib/onboarding-positions';

function isState(value: string): value is State {
  return (STATES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = body.state as State;
    const position = (body.position as string)?.trim();
    if (!state || !position || !isState(state)) {
      return NextResponse.json(
        { error: 'state and position are required' },
        { status: 400 }
      );
    }
    const valid = await isActivePositionForState(state, position);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or inactive position for this state' },
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
