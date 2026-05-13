import { getModuleById } from './training-store';
import { isCompanyWideProgramComplete } from './training-progress';

export async function canMutateTeamModuleContent(userId: string): Promise<boolean> {
  return isCompanyWideProgramComplete(userId);
}

export async function assertTeamSectionMutationAllowed(
  userId: string,
  moduleId: string
): Promise<void> {
  const mod = await getModuleById(moduleId);
  if (!mod) throw new Error('Module not found');
  if (mod.isCompanyWide) return;
  if (!(await canMutateTeamModuleContent(userId))) {
    const err = new Error(
      'Complete all company-wide training before submitting team module progress.'
    );
    (err as any).statusCode = 403;
    throw err;
  }
}
