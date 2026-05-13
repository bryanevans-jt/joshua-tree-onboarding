import type { TrainingQuiz } from './training-quiz';

export interface TrainingTeam {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
}

export interface TrainingModule {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isCompanyWide: boolean;
  teamId: string | null;
  moduleSortOrder: number;
  createdAt: string;
  updatedAt?: string | null;
}

export type TrainingSectionKind = 'video' | 'pdf';

export interface TrainingSection {
  id: string;
  moduleId: string;
  orderIndex: number;
  kind: TrainingSectionKind;
  title: string;
  youtubeUrl?: string | null;
  pdfKey?: string | null;
  quiz: TrainingQuiz | null;
  contentVersion: number;
  summary?: string | null;
  estimatedMinutes?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface TrainingRosterRow {
  email: string;
  teamId: string;
  supervisorEmail: string;
  displayName?: string | null;
}

export interface TrainingSettings {
  allowedDomains: string[];
  notificationEmails: string[];
  communicationsContactName?: string | null;
  communicationsContactEmail?: string | null;
}

export interface TrainingSectionProgressRow {
  userId: string;
  sectionId: string;
  contentVersion: number;
  videoCompletedAt?: string | null;
  quizPassedAt?: string | null;
  quizAttempts: number;
}
