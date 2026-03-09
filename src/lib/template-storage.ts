/**
 * Template PDF storage: Supabase Storage when configured (Vercel), else filesystem (local).
 */

import fs from 'fs';
import path from 'path';
import { hasSupabase, getSupabase } from './supabase-server';
import { positionToJobKey as positionToJobKeyFromConfig } from './config';

const TEMPLATES_BUCKET = 'templates';
const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'templates');

export const SHARED_KEYS = [
  'policy_manual',
  'w4',
  'g4',
  'i9',
  'privacy_notice',
  'direct_deposit',
  'fingerprint_ga',
  'fingerprint_tn',
] as const;

export type SharedTemplateKey = (typeof SHARED_KEYS)[number];

export const positionToJobKey = positionToJobKeyFromConfig;

export function getTemplateKey(key: string, position?: string): string {
  if (key === 'job_description' && position) {
    return positionToJobKey(position);
  }
  return key;
}

export function getAllTemplateKeys(positions: string[]): string[] {
  const keys: string[] = [...SHARED_KEYS];
  positions.forEach((p) => keys.push(positionToJobKey(p)));
  return keys;
}

function getTemplatePath(key: string): string {
  return path.join(TEMPLATES_DIR, `${key}.pdf`);
}

// ---------- Supabase Storage ----------

async function readTemplateSupabase(key: string): Promise<Buffer | null> {
  const supabase = getSupabase();
  const path = `${key}.pdf`;
  const { data, error } = await supabase.storage.from(TEMPLATES_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function ensureBucket() {
  const supabase = getSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === TEMPLATES_BUCKET)) return;
  await supabase.storage.createBucket(TEMPLATES_BUCKET, { public: false });
}

async function saveTemplateSupabase(key: string, buffer: Buffer): Promise<void> {
  const supabase = getSupabase();
  await ensureBucket();
  const filePath = `${key}.pdf`;
  await supabase.storage.from(TEMPLATES_BUCKET).upload(filePath, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
}

async function hasTemplateSupabase(key: string): Promise<boolean> {
  const supabase = getSupabase();
  const filePath = `${key}.pdf`;
  const { error } = await supabase.storage.from(TEMPLATES_BUCKET).download(filePath);
  return !error;
}

async function listUploadedTemplatesSupabase(positions: string[]): Promise<string[]> {
  const supabase = getSupabase();
  const { data: files, error } = await supabase.storage.from(TEMPLATES_BUCKET).list('', {
    limit: 500,
  });
  if (error) return [];
  const names = new Set((files ?? []).map((f) => (f.name || '').replace(/\.pdf$/i, '')));
  const keys = getAllTemplateKeys(positions);
  return keys.filter((k) => names.has(k));
}

// ---------- Filesystem ----------

function ensureDir() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }
}

function readTemplateFile(key: string): Buffer | null {
  const filePath = getTemplatePath(key);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

function saveTemplateFile(key: string, buffer: Buffer): void {
  ensureDir();
  fs.writeFileSync(getTemplatePath(key), buffer);
}

function hasTemplateFile(key: string): boolean {
  return fs.existsSync(getTemplatePath(key));
}

function listUploadedTemplatesFile(positions: string[]): string[] {
  ensureDir();
  const keys = getAllTemplateKeys(positions);
  return keys.filter((key) => hasTemplateFile(key));
}

// ---------- Public API (async) ----------

export async function readTemplate(key: string): Promise<Buffer | null> {
  if (hasSupabase()) return readTemplateSupabase(key);
  return Promise.resolve(readTemplateFile(key));
}

export async function saveTemplate(key: string, buffer: Buffer): Promise<void> {
  if (hasSupabase()) return saveTemplateSupabase(key, buffer);
  saveTemplateFile(key, buffer);
}

export async function hasTemplate(key: string): Promise<boolean> {
  if (hasSupabase()) return hasTemplateSupabase(key);
  return Promise.resolve(hasTemplateFile(key));
}

export async function listUploadedTemplates(positions: string[]): Promise<string[]> {
  if (hasSupabase()) return listUploadedTemplatesSupabase(positions);
  return Promise.resolve(listUploadedTemplatesFile(positions));
}

// ---------- Original filenames (as uploaded in admin) ----------

const FILENAMES_KEY = '_filenames.json';

async function readFilenamesSupabase(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(TEMPLATES_BUCKET).download(FILENAMES_KEY);
  if (error || !data) return {};
  try {
    const text = await data.text();
    const json = JSON.parse(text) as Record<string, string>;
    return typeof json === 'object' && json !== null ? json : {};
  } catch {
    return {};
  }
}

async function writeFilenamesSupabase(filenames: Record<string, string>): Promise<void> {
  const supabase = getSupabase();
  await ensureBucket();
  const body = JSON.stringify(filenames);
  await supabase.storage.from(TEMPLATES_BUCKET).upload(FILENAMES_KEY, body, {
    contentType: 'application/json',
    upsert: true,
  });
}

function readFilenamesFile(): Record<string, string> {
  const filePath = path.join(TEMPLATES_DIR, FILENAMES_KEY);
  if (!fs.existsSync(filePath)) return {};
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, string>;
    return typeof json === 'object' && json !== null ? json : {};
  } catch {
    return {};
  }
}

function writeFilenamesFile(filenames: Record<string, string>): void {
  ensureDir();
  fs.writeFileSync(
    path.join(TEMPLATES_DIR, FILENAMES_KEY),
    JSON.stringify(filenames, null, 2),
    'utf-8'
  );
}

/** Get the original filename for a template (as uploaded in admin), or null. */
export async function getTemplateFilename(key: string): Promise<string | null> {
  if (hasSupabase()) {
    const all = await readFilenamesSupabase();
    return all[key] ?? null;
  }
  const all = readFilenamesFile();
  return all[key] ?? null;
}

/** Set the original filename for a template (call when admin uploads). */
export async function setTemplateFilename(key: string, filename: string): Promise<void> {
  const safe = filename.trim() || `${key}.pdf`;
  if (hasSupabase()) {
    const all = await readFilenamesSupabase();
    all[key] = safe;
    await writeFilenamesSupabase(all);
    return;
  }
  const all = readFilenamesFile();
  all[key] = safe;
  writeFilenamesFile(all);
}
