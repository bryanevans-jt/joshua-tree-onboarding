/** Human labels and attachment filenames for onboarding upload steps. */

export const ONBOARDING_STEP_LABELS: Record<string, string> = {
  job_description: 'Job description',
  policy_manual: 'Policy manual',
  w4: 'W-4',
  g4: 'G-4',
  i9: 'I-9',
  direct_deposit: 'Direct deposit',
  fingerprint: 'Fingerprint / background check',
  national_child_protection_act_consent: 'National Child Protection Act consent',
  privacy_notice: 'Privacy notice',
  drivers_license: "Driver's license",
  ssn_or_birth: 'SSN card or birth certificate',
  headshot: 'Headshot photo',
};

const STEP_TO_FILENAME: Record<string, string> = {
  job_description: 'Job-Description',
  policy_manual: 'Policy-Manual',
  w4: 'W-4',
  g4: 'G-4',
  i9: 'I-9',
  direct_deposit: 'Direct-Deposit',
  fingerprint: 'Fingerprint-Form',
  national_child_protection_act_consent: 'National-Child-Protection-Act-Consent-Form',
  privacy_notice: 'Privacy-Notice',
  drivers_license: 'Drivers-License',
  ssn_or_birth: 'SSN-or-Birth-Certificate',
  headshot: 'Headshot',
};

export function sanitizeNameForFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .slice(0, 80) || 'NewHire'
  );
}

export function attachmentFilename(
  stepId: string,
  storageKey: string,
  newHireName?: string
): string {
  const base = STEP_TO_FILENAME[stepId] ?? stepId;
  const ext = storageKey.includes('.') ? storageKey.split('.').pop()! : 'pdf';
  const suffix = newHireName ? `_${sanitizeNameForFilename(newHireName)}` : '';
  return `${base}${suffix}.${ext}`;
}
