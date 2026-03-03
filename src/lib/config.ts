/**
 * App-wide config: states, positions, document types.
 * Admin can add positions per state; job descriptions and templates are stored in DB/storage.
 */

export const STATES = ['Georgia', 'Tennessee'] as const;
export type State = (typeof STATES)[number];

export const POSITIONS = [
  'Employment Specialist',
  'Transition Instructor',
  'Vocational Supervisor',
  'Transition Supervisor',
  'Community Relations Specialist',
] as const;
export type Position = (typeof POSITIONS)[number];

/** Document types that require a signature from the new hire */
export const DOCUMENT_TYPES = {
  JOB_DESCRIPTION: 'job_description',
  POLICY_MANUAL: 'policy_manual',
  W4: 'w4',
  G4: 'g4',
  I9: 'i9',
  DIRECT_DEPOSIT: 'direct_deposit',
  FINGERPRINT: 'fingerprint',
  PRIVACY_NOTICE: 'privacy_notice',
} as const;

/** Upload types (no signature, just upload) */
export const UPLOAD_TYPES = {
  DRIVERS_LICENSE: 'drivers_license',
  SSN_OR_BIRTH_CERT: 'ssn_or_birth_cert',
  HEADSHOT: 'headshot',
} as const;

/** Which document type is used for fingerprint per state */
export const FINGERPRINT_FORM_BY_STATE: Record<State, string> = {
  Georgia: 'fingerprint_ga',
  Tennessee: 'fingerprint_tn',
};

export const DEFAULT_SIGNATURE_BOX = {
  width: 180,
  height: 50,
  yOffsetFromBottom: 80,
};

export function positionToJobKey(position: string): string {
  const slug = position
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return `job_${slug}`;
}
