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
  error?: string;
}

export interface ReleaseNote {
  version: string;
  date: string;
  body: string;
}

export interface RoadmapItem {
  id: number;
  title: string;
  status: 'planned' | 'in-progress' | 'released';
  url: string;
}
