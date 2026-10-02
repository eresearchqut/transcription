import type { StartTranscriptionJobResponse } from "@aws-sdk/client-transcribe";

import type { RpidDto } from "@eresearchqut/dmp-api";

import {
  getResource,
  getResources,
  putResource,
  updateResource,
  updateResources,
} from "../repository/repository";

export const normaliseJobId = (jobId: string): string =>
  jobId.split("redacted-").at(-1) ?? jobId;

export const jobStarted = (
  identityId: string,
  jobId: string,
  outputKey: string,
  uploadEvent: Record<string, unknown>,
  transcriptionResponse: StartTranscriptionJobResponse,
  metadata: Record<string, unknown>,
  researchProject?: RpidDto,
) =>
  putResource(identityId, jobId, {
    outputKey,
    uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
    transcriptionResponse: JSON.parse(JSON.stringify(transcriptionResponse)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    researchProject,
  });

export const jobRejected = (
  identityId: string,
  jobId: string,
  uploadEvent: Record<string, unknown>,
  metadata: Record<string, unknown>,
  failureReason: string,
) =>
  putResource(identityId, jobId, {
    uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    jobStatusUpdated: {
      detail: {
        TranscriptionJobStatus: "FAILED",
        FailureReason: failureReason,
      },
    },
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
) =>
  updateResources(identityId, normaliseJobId(jobId), {
    downloadKey,
    audioSeconds,
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
