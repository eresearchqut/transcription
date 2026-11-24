import type { StartTranscriptionJobResponse } from "@aws-sdk/client-transcribe";

import {
  createResource,
  getResource,
  getResources,
  updateResource,
  updateResources,
} from "../repository/repository";

export const normaliseJobId = (jobId: string): string =>
  jobId.split("redacted-").at(-1) ?? jobId;

/**
 * Records a job that Transcribe has already started. The handlers for the
 * job's status and output can write to its record first, so this adds to the
 * record and keeps what they wrote.
 */
export const jobStarted = (
  identityId: string,
  jobId: string,
  outputKey: string,
  uploadEvent: Record<string, unknown>,
  transcriptionResponse: StartTranscriptionJobResponse,
  metadata: Record<string, unknown>,
  usageLogged: boolean,
  rpid?: string,
) =>
  updateResources(identityId, jobId, {
    outputKey,
    uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
    transcriptionResponse: JSON.parse(JSON.stringify(transcriptionResponse)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    rpid,
    usageLogged,
    startedAt: new Date().toISOString(),
  });

/**
 * Records a job that never started. Resolves false, leaving the record alone,
 * when the job already has one, as it does when S3 redelivers the upload event.
 */
export const jobRejected = (
  identityId: string,
  jobId: string,
  uploadEvent: Record<string, unknown>,
  metadata: Record<string, unknown>,
  failureReason: string,
  usageLogged: boolean,
) =>
  createResource(identityId, jobId, {
    uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    jobStatusUpdated: {
      detail: {
        TranscriptionJobStatus: "FAILED",
        FailureReason: failureReason,
      },
    },
    usageLogged,
    startedAt: new Date().toISOString(),
  });

export const jobStatusUpdated = (
  identityId: string,
  jobId: string,
  jobStatusUpdated: Record<string, unknown>,
) =>
  updateResource(
    identityId,
    normaliseJobId(jobId),
    "jobStatusUpdated",
    JSON.parse(JSON.stringify(jobStatusUpdated)),
  );

export const downloadKey = (
  identityId: string,
  jobId: string,
  downloadKey: string,
  audioSeconds?: number,
  identifiedLanguage?: string,
) =>
  updateResources(identityId, normaliseJobId(jobId), {
    downloadKey,
    audioSeconds,
    identifiedLanguage,
  });

export const summaryKey = (
  identityId: string,
  jobId: string,
  summaryKey: string,
  summaryUsage?: { inputTokens?: number; outputTokens?: number },
) =>
  updateResources(identityId, normaliseJobId(jobId), {
    summaryKey,
    summaryUsage,
  });

export const translationKey = (
  identityId: string,
  jobId: string,
  translationKey: string,
) =>
  updateResource(
    identityId,
    normaliseJobId(jobId),
    "translationKey",
    translationKey,
  );

export const translationJob = (
  identityId: string,
  jobId: string,
  translationJob: { jobId: string; status: string; message?: string },
  translationCharacters?: number,
) =>
  updateResources(identityId, normaliseJobId(jobId), {
    translationJob,
    translationCharacters,
  });

export const getTranscriptions = (identityId: string) =>
  getResources(identityId);

export const getTranscription = (identityId: string, jobId: string) =>
  getResource(identityId, jobId);
