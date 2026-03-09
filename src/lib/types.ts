import type { State, Position } from './config';

/** Progress saved as the new hire completes each item (before final submit) */
export interface OnboardingProgressData {
  newHireName?: string;
  /** Step id -> storage key/path for uploaded completed document (download + upload flow). */
  uploadedDocumentKeys?: Record<string, string>;
  /** @deprecated Legacy: signatures as data URLs (replaced by uploadedDocumentKeys for doc steps). */
  signatures?: Record<string, string>;
  /** @deprecated Legacy: uploads as data URLs (replaced by uploadedDocumentKeys for upload steps). */
  uploads?: Record<string, string>;
  /** Step ids the user has advanced past (so checklist shows a check) */
  confirmedStepIds?: string[];
  /** @deprecated Legacy: form field values (replaced by upload completed PDFs). */
  formData?: Record<string, Record<string, string | boolean>>;
}

export interface OnboardingLink {
  id: string;
  token: string;
  state: State;
  position: Position;
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
  newHireName?: string;
  /** Draft progress before final submit */
  progress?: OnboardingProgressData;
}

export interface OnboardingProgress {
  linkId: string;
  steps: Record<string, StepStatus>;
}

export type StepStatus = 'pending' | 'in_progress' | 'completed';

export interface AppSettings {
  hrDirectorEmail: string;
  communicationsDirectorEmail: string;
  fromEmail?: string;
  companyName: string;
}

/** Stored template key per document (e.g. policy_manual, w4, fingerprint_ga) */
export interface DocumentTemplate {
  key: string;
  name: string;
  filePath?: string;
  signatureBoxes?: Array<{ pageIndex: number; x: number; y: number; width: number; height: number }>;
}

export interface JobDescriptionTemplate {
  position: Position;
  state: State;
  filePath?: string;
  signatureBoxes?: Array<{ pageIndex: number; x: number; y: number; width: number; height: number }>;
}
