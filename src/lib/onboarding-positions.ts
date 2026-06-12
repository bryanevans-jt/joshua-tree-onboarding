/**
 * State-specific onboarding positions (job descriptions per state).
 * Supabase when configured; else data/onboarding-positions.json for local dev.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { hasSupabase, getSupabase } from './supabase-server';
import {
  STATES,
  slugFromLabel,
  jobTemplateKey,
  legacyJobTemplateKey,
  type State,
} from './config';
import { migrateTemplateKey } from './template-storage';

export interface OnboardingPosition {
  id: string;
  state: State;
  label: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

const POSITIONS_PATH = path.join(process.cwd(), 'data', 'onboarding-positions.json');

const SEED: Array<{ state: State; label: string; slug: string; sortOrder: number }> = [
  { state: 'Georgia', label: 'Employment Specialist', slug: 'employment_specialist', sortOrder: 10 },
  { state: 'Georgia', label: 'Transition Instructor', slug: 'transition_instructor', sortOrder: 20 },
  { state: 'Georgia', label: 'Vocational Supervisor', slug: 'vocational_supervisor', sortOrder: 30 },
  { state: 'Georgia', label: 'Transition Supervisor', slug: 'transition_supervisor', sortOrder: 40 },
  {
    state: 'Georgia',
    label: 'Community Relations Specialist',
    slug: 'community_relations_specialist',
    sortOrder: 50,
  },
  { state: 'Tennessee', label: 'Employment Specialist', slug: 'employment_specialist', sortOrder: 10 },
  { state: 'Tennessee', label: 'Transition Instructor', slug: 'transition_instructor', sortOrder: 20 },
  { state: 'Tennessee', label: 'Vocational Supervisor', slug: 'vocational_supervisor', sortOrder: 30 },
  { state: 'Tennessee', label: 'Transition Supervisor', slug: 'transition_supervisor', sortOrder: 40 },
  {
    state: 'Tennessee',
    label: 'Community Relations Specialist',
    slug: 'community_relations_specialist',
    sortOrder: 50,
  },
];

function rowToPosition(row: {
  id: string;
  state: string;
  label: string;
  slug: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string | null;
}): OnboardingPosition {
  return {
    id: row.id,
    state: row.state as State,
    label: row.label,
    slug: row.slug,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function seedFilePositions(): OnboardingPosition[] {
  const now = new Date().toISOString();
  return SEED.map((s) => ({
    id: randomUUID(),
    state: s.state,
    label: s.label,
    slug: s.slug,
    sortOrder: s.sortOrder,
    active: true,
    createdAt: now,
  }));
}

function loadFilePositions(): OnboardingPosition[] {
  try {
    if (fs.existsSync(POSITIONS_PATH)) {
      const raw = fs.readFileSync(POSITIONS_PATH, 'utf-8');
      const data = JSON.parse(raw) as { positions?: OnboardingPosition[] };
      if (Array.isArray(data.positions) && data.positions.length > 0) {
        return data.positions;
      }
    }
  } catch {
    // ignore
  }
  const seeded = seedFilePositions();
  saveFilePositions(seeded);
  return seeded;
}

function saveFilePositions(positions: OnboardingPosition[]): void {
  const dir = path.dirname(POSITIONS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(POSITIONS_PATH, JSON.stringify({ positions }, null, 2), 'utf-8');
}

async function listPositionsSupabase(
  state: State,
  activeOnly: boolean
): Promise<OnboardingPosition[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('onboarding_positions')
    .select('*')
    .eq('state', state)
    .order('sort_order', { ascending: true });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToPosition);
}

function listPositionsFile(state: State, activeOnly: boolean): OnboardingPosition[] {
  const all = loadFilePositions();
  return all
    .filter((p) => p.state === state && (!activeOnly || p.active))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listPositions(
  state: State,
  opts?: { activeOnly?: boolean }
): Promise<OnboardingPosition[]> {
  const activeOnly = opts?.activeOnly ?? false;
  if (hasSupabase()) {
    return listPositionsSupabase(state, activeOnly);
  }
  return listPositionsFile(state, activeOnly);
}

export async function listAllPositions(opts?: {
  activeOnly?: boolean;
}): Promise<OnboardingPosition[]> {
  const activeOnly = opts?.activeOnly ?? false;
  const out: OnboardingPosition[] = [];
  for (const state of STATES) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await listPositions(state, { activeOnly });
    out.push(...rows);
  }
  return out;
}

async function getPositionByIdSupabase(id: string): Promise<OnboardingPosition | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('onboarding_positions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToPosition(data) : undefined;
}

function getPositionByIdFile(id: string): OnboardingPosition | undefined {
  return loadFilePositions().find((p) => p.id === id);
}

export async function getPositionById(id: string): Promise<OnboardingPosition | undefined> {
  if (hasSupabase()) {
    return getPositionByIdSupabase(id);
  }
  return getPositionByIdFile(id);
}

async function migrateJobTemplateForState(
  state: State,
  oldSlug: string,
  newSlug: string
): Promise<void> {
  if (oldSlug === newSlug) return;
  const oldKey = jobTemplateKey(state, oldSlug);
  const newKey = jobTemplateKey(state, newSlug);
  await migrateTemplateKey(oldKey, newKey);
  const legacyOld = legacyJobTemplateKey(oldSlug);
  if (legacyOld !== oldKey) {
    await migrateTemplateKey(legacyOld, newKey);
  }
}

export async function createPosition(state: State, label: string): Promise<OnboardingPosition> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Position label is required');
  const slug = slugFromLabel(trimmed);

  if (hasSupabase()) {
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('onboarding_positions')
      .select('sort_order')
      .eq('state', state)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = (existing?.sort_order ?? 0) + 10;
    const id = randomUUID();
    const { data, error } = await supabase
      .from('onboarding_positions')
      .insert({
        id,
        state,
        label: trimmed,
        slug,
        sort_order: sortOrder,
        active: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToPosition(data);
  }

  const positions = loadFilePositions();
  if (positions.some((p) => p.state === state && p.slug === slug)) {
    throw new Error('A position with this name already exists for this state');
  }
  const sortOrder =
    Math.max(0, ...positions.filter((p) => p.state === state).map((p) => p.sortOrder)) + 10;
  const position: OnboardingPosition = {
    id: randomUUID(),
    state,
    label: trimmed,
    slug,
    sortOrder,
    active: true,
    createdAt: new Date().toISOString(),
  };
  positions.push(position);
  saveFilePositions(positions);
  return position;
}

export async function updatePosition(
  id: string,
  updates: { label?: string; active?: boolean }
): Promise<OnboardingPosition> {
  const existing = await getPositionById(id);
  if (!existing) throw new Error('Position not found');

  let nextLabel = existing.label;
  let nextSlug = existing.slug;
  if (updates.label !== undefined) {
    const trimmed = updates.label.trim();
    if (!trimmed) throw new Error('Position label is required');
    nextLabel = trimmed;
    nextSlug = slugFromLabel(trimmed);
  }
  const nextActive = updates.active !== undefined ? updates.active : existing.active;

  if (nextSlug !== existing.slug) {
    await migrateJobTemplateForState(existing.state, existing.slug, nextSlug);
  }

  if (hasSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('onboarding_positions')
      .update({
        label: nextLabel,
        slug: nextSlug,
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToPosition(data);
  }

  const positions = loadFilePositions();
  const idx = positions.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error('Position not found');
  if (
    positions.some(
      (p, i) => i !== idx && p.state === existing.state && p.slug === nextSlug
    )
  ) {
    throw new Error('A position with this name already exists for this state');
  }
  positions[idx] = {
    ...positions[idx],
    label: nextLabel,
    slug: nextSlug,
    active: nextActive,
    updatedAt: new Date().toISOString(),
  };
  saveFilePositions(positions);
  return positions[idx];
}

export function templateKeyForPosition(position: OnboardingPosition): string {
  return jobTemplateKey(position.state, position.slug);
}

export async function isActivePositionForState(
  state: State,
  label: string
): Promise<boolean> {
  const positions = await listPositions(state, { activeOnly: true });
  return positions.some((p) => p.label === label);
}
