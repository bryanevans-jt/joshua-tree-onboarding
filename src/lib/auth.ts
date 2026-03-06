/**
 * Superadmin is always allowed; cannot be removed from approved list.
 * Other admins are stored in Supabase approved_admins table.
 */

export const SUPERADMIN_EMAIL = 'bryan.evans@thejoshuatree.org';

export function isSuperadmin(email: string | null | undefined): boolean {
  return email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}
