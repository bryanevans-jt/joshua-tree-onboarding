/**
 * Store: uses Supabase when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * (e.g. on Vercel). Otherwise uses file persistence (data/store.json) for local / single-server.
 */

import type { OnboardingLink, AppSettings, OnboardingProgressData } from './types';
import type { State, Position } from './config';
import { hasSupabase } from './supabase-server';
import * as supabaseStore from './store-supabase';

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data', 'store.json');
const links = new Map<string, OnboardingLink>();
let settings: AppSettings = {
  hrDirectorEmail: '',
  communicationsDirectorEmail: '',
  companyName: 'Joshua Tree Service Group',
};

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const data = JSON.parse(raw) as {
        links?: OnboardingLink[];
        settings?: AppSettings;
      };
      if (Array.isArray(data.links)) {
        data.links.forEach((link) => links.set(link.token, link));
      }
      if (data.settings && typeof data.settings === 'object') {
        settings = { ...settings, ...data.settings };
      }
    }
  } catch {
    // ignore
  }
}

function saveStore() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const linksForStorage = Array.from(links.values()).map(({ progress: _p, ...link }) => link);
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify({ links: linksForStorage, settings }, null, 2),
      'utf-8'
    );
  } catch {
    // ignore
  }
}

loadStore();

function createLinkFile(state: State, position: Position): OnboardingLink {
  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '').slice(0, 24);
  const link: OnboardingLink = {
    id,
    token,
    state,
    position,
    createdAt: new Date().toISOString(),
  };
  links.set(token, link);
  saveStore();
  return link;
}

export async function createLink(state: State, position: Position): Promise<OnboardingLink> {
  if (hasSupabase()) return supabaseStore.createLink(state, position);
  return Promise.resolve(createLinkFile(state, position));
}

export async function getLinkByToken(token: string): Promise<OnboardingLink | undefined> {
  if (hasSupabase()) return supabaseStore.getLinkByToken(token);
  return Promise.resolve(links.get(token));
}

export async function updateLink(
  token: string,
  updates: Partial<Pick<OnboardingLink, 'completedAt' | 'newHireName'>>
): Promise<OnboardingLink | undefined> {
  if (hasSupabase()) return supabaseStore.updateLink(token, updates);
  const link = links.get(token);
  if (!link) return undefined;
  Object.assign(link, updates);
  saveStore();
  return link;
}

export async function saveProgress(
  token: string,
  progress: OnboardingProgressData
): Promise<OnboardingLink | undefined> {
  if (hasSupabase()) return supabaseStore.saveProgress(token, progress);
  const link = links.get(token);
  if (!link) return undefined;
  link.progress = {
    newHireName: progress.newHireName ?? link.progress?.newHireName,
    signatures: { ...link.progress?.signatures, ...(progress.signatures ?? {}) },
    uploads: { ...link.progress?.uploads, ...(progress.uploads ?? {}) },
    confirmedStepIds: progress.confirmedStepIds ?? link.progress?.confirmedStepIds,
    formData: { ...link.progress?.formData, ...(progress.formData ?? {}) },
  };
  saveStore();
  return link;
}

export async function getProgress(token: string): Promise<OnboardingProgressData | undefined> {
  if (hasSupabase()) return supabaseStore.getProgress(token);
  return Promise.resolve(links.get(token)?.progress);
}

export async function getSettings(): Promise<AppSettings> {
  if (hasSupabase()) return supabaseStore.getSettings();
  return Promise.resolve({ ...settings });
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  if (hasSupabase()) return supabaseStore.updateSettings(updates);
  settings = { ...settings, ...updates };
  saveStore();
  return settings;
}

export async function getAllLinks(): Promise<OnboardingLink[]> {
  if (hasSupabase()) return supabaseStore.getAllLinks();
  return Promise.resolve(Array.from(links.values()));
}
