import type { State, Position } from './config';

/** Progress saved as the new hire completes each item (before final submit) */
export interface OnboardingProgressData {
  newHireName?: string;
  signatures?: Record<string, string>;
  uploads?: Record<string, string>;
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
