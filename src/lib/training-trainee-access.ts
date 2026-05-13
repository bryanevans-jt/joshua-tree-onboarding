import { isApprovedAdmin } from '@/lib/approved-admins';
import type { TrainingModule } from '@/lib/training-types';
import { getRosterRow, isTaggedSupervisor } from '@/lib/training-store';

/** Admins, rostered learners, or tagged supervisors (personal training + portal). */
export async function canUseTrainingCenter(userEmail: string): Promise<boolean> {
  if (await isApprovedAdmin(userEmail)) return true;
  if (await getRosterRow(userEmail)) return true;
  return isTaggedSupervisor(userEmail);
}

export async function canUserAccessTrainingModule(
  userEmail: string,
  module: TrainingModule
): Promise<boolean> {
  if (await isApprovedAdmin(userEmail)) return true;
  const roster = await getRosterRow(userEmail);
  if (module.isCompanyWide) {
    if (roster) return true;
    return isTaggedSupervisor(userEmail);
  }
  if (!roster) return false;
  return !!module.teamId && roster.teamIds.includes(module.teamId);
}
