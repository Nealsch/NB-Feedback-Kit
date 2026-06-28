// Shared TypeScript types for NB Feedback Kit

export type FeedbackType = 'bug' | 'feature' | 'feedback';

export interface FeedbackMetadata {
  application: string;
  version: string;
  route?: string;
  browser?: string;
  os?: string;
  screenResolution?: string;
  timestamp: string;
  userId?: string;
}

export interface FeedbackPayload {
  type: FeedbackType;
  title: string;
  description: string;
  metadata: FeedbackMetadata;
}

export interface FeedbackResponse {
  success: boolean;
  issueUrl?: string;
  issueNumber?: number;
  error?: string;
}

export interface ReleaseNote {
  version: string;
  date: string;
  body: string;
  /** Optional link to the GitHub release page. Omitted on older API responses. */
  url?: string;
}

export interface RoadmapItem {
  id: number;
  title: string;
  status: 'planned' | 'in-progress' | 'released';
  url: string;
}
