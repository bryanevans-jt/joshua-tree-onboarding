/**
 * Temporary storage for onboarding uploads (completed PDFs, license, headshot).
 * Supabase Storage when configured, else filesystem. Deleted after submit + email delivery.
 */

import fs from 'fs';
import path from 'path';
import { hasSupabase, getSupabase } from './supabase-server';

const BUCKET = 'onboarding-uploads';
const LOCAL_DIR = path.join(process.cwd(), 'data', 'onboarding-uploads');

function getExtension(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  return 'bin';
}

function localPath(linkId: string, key: string): string {
  return path.join(LOCAL_DIR, linkId, key);
}

// ---------- Supabase ----------

async function uploadSupabase(
  linkId: string,
  stepId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getSupabase();
  const ext = getExtension(mimeType);
  const key = `${stepId}.${ext}`;
  const storagePath = `${linkId}/${key}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return key;
}

async function downloadSupabase(linkId: string, key: string): Promise<Buffer | null> {
  const supabase = getSupabase();
  const storagePath = `${linkId}/${key}`;
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function listKeysSupabase(linkId: string): Promise<string[]> {
  const supabase = getSupabase();
  const { data: files, error } = await supabase.storage.from(BUCKET).list(linkId);
  if (error) return [];
  return (files ?? []).map((f) => f.name).filter(Boolean);
}

async function deleteAllSupabase(linkId: string): Promise<void> {
  const supabase = getSupabase();
  const keys = await listKeysSupabase(linkId);
  if (keys.length === 0) return;
  const paths = keys.map((k) => `${linkId}/${k}`);
  await supabase.storage.from(BUCKET).remove(paths);
}

// ---------- Filesystem ----------

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function uploadFile(
  linkId: string,
  stepId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = getExtension(mimeType);
  const key = `${stepId}.${ext}`;
  const fullPath = localPath(linkId, key);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, buffer);
  return key;
}

async function downloadFile(linkId: string, key: string): Promise<Buffer | null> {
  const fullPath = localPath(linkId, key);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

async function listKeysFile(linkId: string): Promise<string[]> {
  const dir = path.join(LOCAL_DIR, linkId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}

async function deleteAllFile(linkId: string): Promise<void> {
  const dir = path.join(LOCAL_DIR, linkId);
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, name));
  }
  fs.rmdirSync(dir);
}

// ---------- Public API ----------

export async function uploadDocument(
  linkId: string,
  stepId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (hasSupabase()) return uploadSupabase(linkId, stepId, buffer, mimeType);
  return uploadFile(linkId, stepId, buffer, mimeType);
}

export async function downloadDocument(linkId: string, key: string): Promise<Buffer | null> {
  if (hasSupabase()) return downloadSupabase(linkId, key);
  return downloadFile(linkId, key);
}

export async function deleteAllDocumentsForLink(linkId: string): Promise<void> {
  if (hasSupabase()) return deleteAllSupabase(linkId);
  return deleteAllFile(linkId);
}

/** Ensure bucket exists (Supabase only). Call once at app start or first upload. */
export async function ensureBucket(): Promise<void> {
  if (!hasSupabase()) return;
  const supabase = getSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  await supabase.storage.createBucket(BUCKET, { public: false });
}

/** Delete files in onboarding-uploads older than maxAgeDays. Returns count deleted. */
export async function cleanupOldUploads(maxAgeDays: number = 30): Promise<{ deleted: number }> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  if (hasSupabase()) {
    const supabase = getSupabase();
    const { data: rootItems } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
    const linkIds = (rootItems ?? []).map((i) => i.name).filter((n) => n && n !== '.emptyFolderPlaceholder');
    for (const linkId of linkIds) {
      const { data: files } = await supabase.storage.from(BUCKET).list(linkId, { limit: 100 });
      const toRemove: string[] = [];
      for (const f of files ?? []) {
        if (!f.name) continue;
        const updatedAt = (f as { updated_at?: string }).updated_at;
        const createdAt = (f as { created_at?: string }).created_at;
        const ts = updatedAt || createdAt;
        if (ts) {
          const t = new Date(ts).getTime();
          if (t < cutoff) toRemove.push(`${linkId}/${f.name}`);
        }
      }
      if (toRemove.length > 0) {
        await supabase.storage.from(BUCKET).remove(toRemove);
        deleted += toRemove.length;
      }
    }
    return { deleted };
  }

  if (!fs.existsSync(LOCAL_DIR)) return { deleted: 0 };
  const linkIds = fs.readdirSync(LOCAL_DIR);
  for (const linkId of linkIds) {
    const dir = path.join(LOCAL_DIR, linkId);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const name of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, name);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
        deleted++;
      }
    }
    const remaining = fs.readdirSync(dir);
    if (remaining.length === 0) fs.rmdirSync(dir);
  }
  return { deleted };
}
