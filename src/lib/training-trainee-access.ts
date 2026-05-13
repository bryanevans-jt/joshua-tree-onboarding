import { isApprovedAdmin } from '@/lib/approved-admins';
import type { TrainingModule } from '@/lib/training-types';
import { getRosterRow } from '@/lib/training-store';

export async function canUserAccessTrainingModule(
  userEmail: string,
  module: TrainingModule
): Promise<boolean> {
  if (await isApprovedAdmin(userEmail)) return true;
  const roster = await getRosterRow(userEmail);
  if (!roster) return false;
  if (module.isCompanyWide) return true;
  return module.teamId === roster.teamId;
}
