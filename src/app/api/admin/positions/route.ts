import { NextResponse } from 'next/server';
import { STATES, type State } from '@/lib/config';
import {
  createPosition,
  listPositions,
  type OnboardingPosition,
} from '@/lib/onboarding-positions';

function isState(value: string): value is State {
  return (STATES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateParam = searchParams.get('state');
    const activeOnly = searchParams.get('activeOnly') === '1' || searchParams.get('activeOnly') === 'true';

    if (stateParam) {
      if (!isState(stateParam)) {
        return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
      }
      const positions = await listPositions(stateParam, { activeOnly });
      return NextResponse.json({ positions });
    }

    const positions: OnboardingPosition[] = [];
    for (const state of STATES) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await listPositions(state, { activeOnly });
      positions.push(...rows);
    }
    return NextResponse.json({ positions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = body.state as State;
    const label = (body.label as string)?.trim();
    if (!state || !isState(state) || !label) {
      return NextResponse.json({ error: 'state and label are required' }, { status: 400 });
    }
    const position = await createPosition(state, label);
    return NextResponse.json({ position });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
