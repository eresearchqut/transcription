import type { TranscriptionJobStatus } from "./transcription";

export interface UsageRecord {
  /** `USER#{identityId}` */
  pk: string;
  /** `JOB#{jobId}` */
  sk: string;
  identityId: string;
  jobId: string;

  rpid?: string;
  rpidPayload?: Record<string, unknown>;

  sourceLanguages?: string[];
  resolvedLanguage?: string;
  targetLanguage?: string;
  mimeType?: string;

  piiRedaction: boolean;
  summaryRequested: boolean;
  translationRequested: boolean;

  bytesUploaded?: number;
  audioSeconds?: number;
  summaryInputTokens?: number;
  summaryOutputTokens?: number;
  translationCharacters?: number;

  status?: TranscriptionJobStatus;
  failureReason?: string;
  translationStatus?: string;
  translationFailureReason?: string;

  usageMonth: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  expiredAt?: string;
}

export const USAGE_PK_PREFIX = "USER#";
export const USAGE_SK_PREFIX = "JOB#";

export const usagePartitionKey = (identityId: string) =>
  `${USAGE_PK_PREFIX}${identityId}`;

export const usageSortKey = (jobId: string) => `${USAGE_SK_PREFIX}${jobId}`;
