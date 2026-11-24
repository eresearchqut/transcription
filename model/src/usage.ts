import type { TranscriptionJobStatus } from "./transcription";

export interface UsageRecord {
  /** `USER#{identityId}` */
  pk: string;
  /** `JOB#{jobId}` */
  sk: string;
  identityId: string;
  jobId: string;

  /**
   * The RPID the DMP confirmed at upload, which keys `byRpid`. Absent when the
   * upload was rejected or the `rpid` flag was off.
   */
  rpid?: string;

  sourceLanguages?: string[];
  /**
   * The language Transcribe identified, or the one the job was started with.
   * For a multi-language job this is the language spoken for longest.
   */
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
