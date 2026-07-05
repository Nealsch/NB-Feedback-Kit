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

/**
 * Metadata describing a file that has been uploaded to a storage provider.
 * Used for screenshot attachments embedded into the created issue.
 */
export interface UploadedFile {
  /** Public (or signed) URL the issue provider can render. */
  url: string;
  /** Original filename of the uploaded file. */
  filename: string;
  /** MIME type, e.g. `image/png`. */
  contentType: string;
  /** File size in bytes. */
  size: number;
}

export interface FeedbackPayload {
  type: FeedbackType;
  title: string;
  description: string;
  metadata: FeedbackMetadata;
  /**
   * Screenshots uploaded via the configured storage provider.
   * Rendered as Markdown images in the issue body. Optional for backward
   * compatibility — omit when screenshot uploads are disabled or unavailable.
   */
  attachments?: UploadedFile[];
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
