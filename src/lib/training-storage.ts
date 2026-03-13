import { hasSupabase, getSupabase } from './supabase-server';
import fs from 'fs';
import path from 'path';

const BUCKET = 'training-presentations';
const LOCAL_DIR = path.join(process.cwd(), 'data', 'training-presentations');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

export async function uploadTrainingPdf(
  moduleId: string,
  videoId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const safeName = filename.replace(/[^\w.\-]+/g, '_');
  const key = `${moduleId}/${videoId}/${safeName}`;

  if (hasSupabase()) {
    const supabase = getSupabase();
    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, {
        upsert: true,
        contentType: 'application/pdf',
      });
    if (error) throw new Error(error.message);
    return key;
  }

  ensureLocalDir();
  const fullPath = path.join(LOCAL_DIR, key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return key;
}

export async function downloadTrainingPdf(key: string): Promise<Buffer | null> {
  if (hasSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) return null;
    const arrayBuf = await data.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  const fullPath = path.join(LOCAL_DIR, key);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

export async function deleteTrainingPdf(key: string): Promise<void> {
  if (hasSupabase()) {
    const supabase = getSupabase();
    await supabase.storage.from(BUCKET).remove([key]);
    return;
  }
  const fullPath = path.join(LOCAL_DIR, key);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}


