export interface TrainingModule {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TrainingVideo {
  id: string;
  moduleId: string;
  title: string;
  youtubeUrl: string;
  version: number;
  orderIndex: number;
  presentationPdfKey?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TrainingProgress {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  moduleId: string;
  videoId: string;
  videoVersionAtCompletion: number;
  completedAt: string;
}

export interface TrainingSettings {
  allowedDomains: string[];
  notificationEmails: string[];
}

