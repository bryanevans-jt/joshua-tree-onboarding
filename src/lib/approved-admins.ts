/**
 * Approved admin emails (who can sign in to /admin). Superadmin is always allowed.
 * Stored in Supabase approved_admins when Supabase is configured.
 */

import { hasSupabase, getSupabase } from './supabase-server';
import { SUPERADMIN_EMAIL } from './auth';

export async function isApprovedAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (lower === SUPERADMIN_EMAIL.toLowerCase()) return true;
  if (!hasSupabase()) return false;
  const supabase = getSupabase();
  const { data } = await supabase
    .from('approved_admins')
    .select('email')
    .eq('email', lower)
    .maybeSingle();
  return !!data;
}

export async function getApprovedAdmins(): Promise<string[]> {
  if (!hasSupabase()) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('approved_admins').select('email').order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => r.email);
}

export async function addApprovedAdmin(email: string): Promise<{ ok: boolean; error?: string; email?: string }> {
  const lower = email.trim().toLowerCase();
  if (!lower) return { ok: false, error: 'Email required' };
  if (lower === SUPERADMIN_EMAIL.toLowerCase()) return { ok: false, error: 'Superadmin is always approved' };
  if (!hasSupabase()) return { ok: false, error: 'Not configured' };
  const supabase = getSupabase();
  const { error } = await supabase.from('approved_admins').insert({ email: lower }).select().single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Already approved' };
    return { ok: false, error: error.message };
  }
  return { ok: true, email: lower };
}

export async function removeApprovedAdmin(email: string): Promise<{ ok: boolean; error?: string }> {
  const lower = email.trim().toLowerCase();
  if (lower === SUPERADMIN_EMAIL.toLowerCase()) return { ok: false, error: 'Cannot remove superadmin' };
  if (!hasSupabase()) return { ok: false, error: 'Not configured' };
  const supabase = getSupabase();
  const { error } = await supabase.from('approved_admins').delete().eq('email', lower);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
